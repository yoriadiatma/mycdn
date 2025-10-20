$(function(){
  $.getJSON('/api/stats', function(d){
    $('#prov').text(d.provinces);
    $('#kab').text(d.regencies);
    $('#kec').text(d.districts);
    $('#nag').text(d.villages);
  });

  $.getJSON('/api/chart', function(rows){
    const ctx = document.getElementById('chart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.regency),
        datasets: [{
          label: 'Jumlah Program',
          data: rows.map(r => r.total),
          backgroundColor: [
            'rgba(44, 90, 160, 0.8)',
            'rgba(248, 165, 28, 0.8)',
            'rgba(40, 167, 69, 0.8)',
            'rgba(23, 162, 184, 0.8)',
            'rgba(108, 117, 125, 0.8)',
            'rgba(220, 53, 69, 0.8)',
            'rgba(255, 193, 7, 0.8)',
            'rgba(111, 66, 193, 0.8)'
          ],
          borderColor: [
            'rgba(44, 90, 160, 1)',
            'rgba(248, 165, 28, 1)',
            'rgba(40, 167, 69, 1)',
            'rgba(23, 162, 184, 1)',
            'rgba(108, 117, 125, 1)',
            'rgba(220, 53, 69, 1)',
            'rgba(255, 193, 7, 1)',
            'rgba(111, 66, 193, 1)'
          ],
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 13
            },
            padding: 10,
            cornerRadius: 4
          }
        }
      }
    });
  });

  $('#table').DataTable({
    ajax: '/api/programs',
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    language: {
      search: "Cari:",
      lengthMenu: "Tampilkan _MENU_ data",
      info: "Menampilkan _START_ hingga _END_ dari _TOTAL_ data",
      infoEmpty: "Menampilkan 0 hingga 0 dari 0 data",
      infoFiltered: "(disaring dari _MAX_ total data)",
      paginate: {
        first: "Pertama",
        last: "Terakhir",
        next: "Selanjutnya",
        previous: "Sebelumnya"
      }
    },
    columns: [
      { 
        data: null,
        render: (data, type, row, meta) => meta.row + 1,
        className: 'text-center',
        width: '60px'
      },
      { data: 'village', title: 'Nagari' },
      { data: 'district', title: 'Kecamatan' },
      { data: 'regency', title: 'Kabupaten/Kota' },
      { 
        data: 'year', 
        title: 'Tahun',
        className: 'text-center',
        width: '100px'
      },
      { 
        data: 'website', 
        title: 'Website', 
        render: (d) => d ? `<a href="${d}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="fas fa-external-link-alt"></i> Kunjungi</a>` : '<span class="text-muted">-</span>',
        className: 'text-center',
        width: '120px'
      }
    ]
  });

  const map = L.map('map').setView([-0.5, 100.5], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  function createCustomMarker(status) {
    let pinColor = '#4394ea'; 
    
    if (status === 'Aktif') {
      pinColor = '#28a745'; 
    } else if (status === 'Dalam Pengembangan') {
      pinColor = '#ffc107';
    }
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div class="marker-pin ${status === 'Aktif' ? 'active' : status === 'Dalam Pengembangan' ? 'development' : ''}" style="background: ${pinColor}">
          <i class="fas fa-map-marker-alt" style="position: absolute; z-index: 1; color: ${pinColor}; font-size: 12px; top: 4px; left: 9px; transform: rotate(45deg);"></i>
        </div>
        <div class="pulse" style="box-shadow: 0 0 1px 2px ${pinColor};"></div>
      `,
      iconSize: [30, 42],
      iconAnchor: [15, 42]
    });
  }
  
  $.getJSON('/api/map', function(points){
    points.forEach(p => {
      if(p.lat && p.lng){
        const customIcon = createCustomMarker(p.status);
        
        const marker = L.marker([p.lat, p.lng], {icon: customIcon}).addTo(map);
        
        let statusClass = '';
        switch(p.status) {
          case 'Aktif': statusClass = 'text-success'; break;
          case 'Dalam Pengembangan': statusClass = 'text-warning'; break;
          default: statusClass = 'text-danger';
        }
        
        marker.bindPopup(`
          <div class="p-2" style="min-width: 200px;">
            <h6 class="fw-bold mb-1 text-primary">${p.village}</h6>
            <p class="mb-1"><i class="fas fa-map-marker-alt me-1"></i>${p.regency}</p>
            <p class="mb-1"><i class="fas fa-info-circle me-1"></i>Status: <span class="${statusClass} fw-bold">${p.status}</span></p>
            ${p.website ? `<a href="${p.website}" target="_blank" class="btn btn-sm btn-warning mt-1 w-100"><i class="fas fa-external-link-alt me-1"></i>Kunjungi Website</a>` : '<p class="text-muted mt-1"><i class="fas fa-globe me-1"></i>Tidak ada website</p>'}
          </div>
        `);
        
        marker.on('mouseover', function() {
          this.openPopup();
        });
      }
    });
    
    if (points.length > 0) {
      const group = new L.featureGroup(points
        .filter(p => p.lat && p.lng)
        .map(p => L.marker([p.lat, p.lng])));
      map.fitBounds(group.getBounds().pad(0.1));
    }
    
  });

});
