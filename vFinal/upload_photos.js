// Esperar a que las librerías de Firebase se carguen por completo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que Firebase está disponible antes de inicializarlo
    const checkFirebaseLoaded = setInterval(() => {
        if (window.firebase) {
            clearInterval(checkFirebaseLoaded);
            initializeApp();
        }
    }, 100);

    // Timeout de seguridad (10 segundos)
    setTimeout(() => {
        clearInterval(checkFirebaseLoaded);
        if (!window.firebase) {
            showModal('Error', 'No se pudo cargar Firebase. Por favor, recarga la página.', 'error');
        }
    }, 10000);
});

// Función principal de inicialización
function initializeApp() {
    // Configuración de Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyCek7bTb6WlbJw5Xjmvsk4hSvWAQ_g7yPs",
        authDomain: "un-viaje-nuevo.firebaseapp.com",
        projectId: "un-viaje-nuevo",
        storageBucket: "un-viaje-nuevo.appspot.com", // Corregido el nombre del bucket
        messagingSenderId: "872379280680",
        appId: "1:872379280680:web:c7b09f71760bfe44dcf41d",
        measurementId: "G-J021Q5QKX6"
    };

    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const storage = firebase.storage();
    const auth = firebase.auth();

    // Variables globales
    let userName = '';
    let map;
    let marker;
    let autocomplete;
    let imageFile = null;
    let uploadTask = null;

    // Obtener id_sala desde la URL
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('id_sala');

    if (!roomId) {
        showModal('Error', 'ID de sala no encontrado.', 'error', () => {
            window.location.href = "gallery_photos.html";
        });
        return;
    }

    // Referencias a elementos del DOM
    const elements = {
        form: document.getElementById('uploadForm'),
        image: document.getElementById('image'),
        preview: document.getElementById('preview'),
        previewContainer: document.querySelector('.image-preview-container'),
        removeImageBtn: document.getElementById('removeImage'),
        description: document.getElementById('description'),
        charCount: document.getElementById('charCount'),
        date: document.getElementById('date'),
        inSpain: document.getElementById('inSpain'),
        locationInput: document.getElementById('locationInput'),
        clearLocationBtn: document.getElementById('clearLocation'),
        latitude: document.getElementById('latitude'),
        longitude: document.getElementById('longitude'),
        placeId: document.getElementById('placeId'),
        formattedAddress: document.getElementById('formattedAddress'),
        locationText: document.getElementById('locationText'),
        cancelButton: document.getElementById('cancelButton'),
        submitButton: document.getElementById('submitButton'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        uploadProgress: document.getElementById('uploadProgress'),
        galleryLink: document.getElementById('gallery'),
        selectedLocation: document.getElementById('selectedLocation')
    };

    // Configurar fecha por defecto (hoy)
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    elements.date.value = formattedDate;

    // Configurar el enlace de volver a la galería
    if (roomId) {
        elements.galleryLink.href = `gallery_photos.html?id_sala=${roomId}`;
    }

    // Inicializar Google Maps y Places
    function initializeGoogleMaps() {
        // Verificar que la API de Google Maps esté cargada
        if (!window.google || !window.google.maps) {
            console.error('Google Maps API no está disponible');
            setTimeout(initializeGoogleMaps, 1000); // Reintentar en 1 segundo
            return;
        }

        try {
            // Centrar el mapa en España por defecto
            const mapOptions = {
                center: { lat: 40.416775, lng: -3.703790 }, // Madrid, España
                zoom: 6,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true
            };
            
            map = new google.maps.Map(document.getElementById('map'), mapOptions);

            // Configurar Autocomplete
            autocomplete = new google.maps.places.Autocomplete(
                elements.locationInput,
                { 
                    types: ['geocode', 'establishment'],
                    fields: ['place_id', 'geometry', 'name', 'formatted_address']
                }
            );

            // Evento cuando se selecciona un lugar del autocomplete
            autocomplete.addListener('place_changed', function() {
                const place = autocomplete.getPlace();
                if (!place.geometry) {
                    showModal('Aviso', 'No se encontraron detalles para este lugar', 'error');
                    return;
                }

                updateMapMarker(place);
            });

            // Permitir hacer clic en el mapa para seleccionar ubicación
            map.addListener('click', function(event) {
                const geocoder = new google.maps.Geocoder();
                
                // Mostrar feedback visual mientras se carga
                if (elements.selectedLocation.querySelector('.loading-dot')) {
                    elements.selectedLocation.querySelector('.loading-dot').remove();
                }
                elements.selectedLocation.style.display = 'flex';
                elements.locationText.innerHTML = 'Obteniendo información... <span class="loading-dot"></span>';
                
                geocoder.geocode({ location: event.latLng }, function(results, status) {
                    if (status === 'OK' && results[0]) {
                        updateMapMarker({
                            geometry: { location: event.latLng },
                            formatted_address: results[0].formatted_address,
                            place_id: results[0].place_id || 'unknown',
                            name: results[0].formatted_address
                        });
                        elements.locationInput.value = results[0].formatted_address;
                        
                        // Mostrar un tooltip informativo
                        showTooltip(marker, '¡Puedes arrastrar este marcador para ajustar la ubicación!');
                    } else {
                        console.error('Geocoder failed:', status);
                        // En caso de error, al menos colocar el marcador con las coordenadas
                        updateMapMarker({
                            geometry: { location: event.latLng },
                            formatted_address: `Lat: ${event.latLng.lat().toFixed(6)}, Lng: ${event.latLng.lng().toFixed(6)}`,
                            place_id: 'unknown',
                            name: 'Ubicación sin información'
                        });
                        elements.locationInput.value = '';
                    }
                });
            });
        } catch (error) {
            console.error('Error al inicializar Google Maps:', error);
            showModal('Error', 'No se pudo inicializar el mapa. Por favor, recarga la página.', 'error');
        }
    }

    // Función para actualizar el marcador en el mapa
    function updateMapMarker(place) {
        if (!place || !place.geometry) return;

        // Centrar mapa en la ubicación
        map.setCenter(place.geometry.location);
        map.setZoom(15);

        // Eliminar marcador anterior si existe
        if (marker) {
            marker.setMap(null);
        }

        // Crear nuevo marcador arrastrable
        marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location,
            animation: google.maps.Animation.DROP,
            draggable: true // Hacer que el marcador sea arrastrable
        });
        
        // Evento cuando se termina de arrastrar el marcador
        marker.addListener('dragend', function() {
            const newPosition = marker.getPosition();
            const geocoder = new google.maps.Geocoder();
            
            // Obtener la información de la nueva ubicación
            geocoder.geocode({ location: newPosition }, function(results, status) {
                if (status === 'OK' && results[0]) {
                    // Actualizar los campos de ubicación
                    elements.latitude.value = newPosition.lat();
                    elements.longitude.value = newPosition.lng();
                    elements.placeId.value = results[0].place_id || '';
                    elements.formattedAddress.value = results[0].formatted_address;
                    elements.locationInput.value = results[0].formatted_address;
                    
                    // Actualizar texto de ubicación seleccionada
                    elements.locationText.textContent = results[0].formatted_address;
                    elements.selectedLocation.style.display = 'flex';
                } else {
                    console.error('Geocoder failed:', status);
                    // Mantener al menos las coordenadas
                    elements.latitude.value = newPosition.lat();
                    elements.longitude.value = newPosition.lng();
                    elements.locationText.textContent = `Lat: ${newPosition.lat().toFixed(6)}, Lng: ${newPosition.lng().toFixed(6)}`;
                }
            });
        });

        // Guardar datos de la ubicación
        elements.latitude.value = place.geometry.location.lat();
        elements.longitude.value = place.geometry.location.lng();
        elements.placeId.value = place.place_id || '';
        elements.formattedAddress.value = place.formatted_address || place.name;

        // Actualizar texto de ubicación seleccionada
        elements.locationText.textContent = place.formatted_address || place.name;
        elements.selectedLocation.style.display = 'flex';
    }

    // Limpiar ubicación
    elements.clearLocationBtn.addEventListener('click', function() {
        elements.locationInput.value = '';
        elements.locationText.textContent = 'Ninguna ubicación seleccionada';
        
        if (marker) {
            marker.setMap(null);
            marker = null;
        }
        
        elements.latitude.value = '';
        elements.longitude.value = '';
        elements.placeId.value = '';
        elements.formattedAddress.value = '';
    });

    // Verificar si el usuario está autenticado
    auth.onAuthStateChanged(async user => {
        if (user) {
            console.log("Usuario autenticado:", user.email);
            try {
                // Verificar si el usuario está en la sala correcta
                const salasRef = db.collection("salas");
                const salaQuery = await salasRef
                    .where("miembros", "array-contains", user.uid)
                    .where("estado", "==", "activa")
                    .get();

                if (salaQuery.empty) {
                    showModal('Acceso denegado', 'No tienes acceso a esta sala.', 'error', () => {
                        window.location.href = 'dashboard.html';
                    });
                    return;
                }

                const salaActual = salaQuery.docs[0];
                if (salaActual.id !== roomId) {
                    showModal('Acceso denegado', 'No tienes acceso a esta sala.', 'error', () => {
                        window.location.href = 'dashboard.html';
                    });
                    return;
                }

                // Obtener el nombre del usuario
                const userDoc = await db.collection('usuarios').doc(user.uid).get();
                if (userDoc.exists) {
                    userName = userDoc.data().nombre;
                    console.log('Nombre del usuario:', userName);
                } else {
                    console.log('No se encontró el documento del usuario');
                    userName = user.email; // Usar email como respaldo
                }

            } catch (error) {
                console.error("Error verificando sala:", error);
                showModal('Error', 'Error verificando acceso a la sala.', 'error', () => {
                    window.location.href = 'dashboard.html';
                });
            }
        } else {
            showModal('Sesión requerida', 'Por favor, inicia sesión para poder subir fotos.', 'error', () => {
                window.location.href = 'index.html';
            });
        }
    });

    // Función para mostrar la vista previa de la imagen
    elements.image.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Verificar tipo de archivo
        if (!file.type.match('image.*')) {
            showModal('Formato no válido', 'Por favor, selecciona un archivo de imagen válido (JPG, PNG, WEBP).', 'error');
            elements.image.value = '';
            return;
        }
        
        // Verificar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showModal('Archivo demasiado grande', 'El tamaño máximo permitido es 10MB.', 'error');
            elements.image.value = '';
            return;
        }
        
        // Guardar la imagen para subirla después
        imageFile = file;
        
        // Crear vista previa
        const reader = new FileReader();
        reader.onload = function(e) {
            elements.preview.src = e.target.result;
            elements.previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    // Eliminar la imagen seleccionada
    elements.removeImageBtn.addEventListener('click', function() {
        elements.image.value = '';
        elements.previewContainer.style.display = 'none';
        imageFile = null;
    });

    // Contador de caracteres para la descripción
    elements.description.addEventListener('input', function() {
        const count = this.value.length;
        elements.charCount.textContent = count;
        
        // Cambiar color si se acerca al límite
        if (count > 450) {
            elements.charCount.style.color = 'orange';
        } else if (count > 490) {
            elements.charCount.style.color = 'red';
        } else {
            elements.charCount.style.color = '';
        }
    });

    // Botón cancelar
    elements.cancelButton.addEventListener('click', function() {
        if (confirm('¿Estás seguro de que deseas cancelar? Se perderán los datos ingresados.')) {
            window.location.href = `gallery_photos.html?id_sala=${roomId}`;
        }
    });

    // Manejar el envío del formulario para subir fotos
    elements.form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validar formulario
        if (!validateForm()) {
            return;
        }

        // Mostrar overlay de carga
        elements.loadingOverlay.style.display = 'flex';
        elements.uploadProgress.style.width = '0%';
        
        try {
            // Subir imagen al Storage
            const storageRef = storage.ref(`paseos/${roomId}/${Date.now()}-${imageFile.name}`);
            uploadTask = storageRef.put(imageFile);
            
            // Mostrar progreso de la carga
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    elements.uploadProgress.style.width = progress + '%';
                },
                (error) => {
                    // Error durante la carga
                    console.error('Error al subir imagen:', error);
                    elements.loadingOverlay.style.display = 'none';
                    showModal('Error', 'Error al subir la imagen. Por favor, intenta de nuevo.', 'error');
                },
                async () => {
                    // Carga completada
                    const imageUrl = await uploadTask.snapshot.ref.getDownloadURL();
                    
                    // Ajustar fecha según la opción seleccionada
                    const selectedDate = new Date(elements.date.value);
                    if (!elements.inSpain.checked) {
                        // Si no está en España, añadir un día por la conversión de timezone
                        selectedDate.setDate(selectedDate.getDate() + 1);
                    }
                    
                    // Crear objeto de ubicación
                    const location = {
                        latitude: parseFloat(elements.latitude.value) || null,
                        longitude: parseFloat(elements.longitude.value) || null,
                        placeId: elements.placeId.value || '',
                        formattedAddress: elements.formattedAddress.value || ''
                    };
                    
                    // Guardar datos en Firestore
                    await db.collection('paseos').add({
                        id_sala: roomId,
                        imageUrl,
                        description: elements.description.value,
                        author: userName,
                        date: selectedDate.toISOString().split('T')[0],
                        location,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    elements.loadingOverlay.style.display = 'none';
                    showModal('¡Éxito!', 'Foto subida correctamente.', 'success', () => {
                        window.location.href = `gallery_photos.html?id_sala=${roomId}`;
                    });
                }
            );
            
        } catch (error) {
            console.error('Error al procesar la subida:', error);
            elements.loadingOverlay.style.display = 'none';
            showModal('Error', 'Ocurrió un error al subir la foto. Por favor, intenta de nuevo.', 'error');
        }
    });

    // Función para validar el formulario antes de enviar
    function validateForm() {
        // Validar imagen
        if (!imageFile) {
            showModal('Campos incompletos', 'Por favor, selecciona una imagen.', 'error');
            return false;
        }
        
        // Validar descripción
        if (!elements.description.value.trim()) {
            showModal('Campos incompletos', 'Por favor, ingresa una descripción.', 'error');
            elements.description.focus();
            return false;
        }
        
        // Validar fecha
        if (!elements.date.value) {
            showModal('Campos incompletos', 'Por favor, selecciona una fecha.', 'error');
            elements.date.focus();
            return false;
        }
        
        // Validar ubicación (opcional, según requerimientos)
        if (!elements.formattedAddress.value && confirm('¿Deseas continuar sin especificar una ubicación?')) {
            return true;
        } else if (!elements.formattedAddress.value) {
            elements.locationInput.focus();
            return false;
        }
        
        return true;
    }

    // Función para mostrar un tooltip temporal en un marcador
    function showTooltip(marker, message) {
        const infoWindow = new google.maps.InfoWindow({
            content: `<div style="padding: 8px; font-family: Arial; font-size: 14px;">${message}</div>`
        });
        
        infoWindow.open(map, marker);
        
        // Cerrar después de 4 segundos
        setTimeout(() => {
            infoWindow.close();
        }, 4000);
    }
    
    // Función para mostrar modales
    function showModal(title, message, type, callback) {
        const modal = document.getElementById('resultModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalButton = document.getElementById('modalButton');
        const modalIcon = document.getElementById('modalIcon');
        const closeModal = document.getElementById('closeModal');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        if (type === 'success') {
            modalIcon.className = 'fas fa-check-circle';
            modalButton.textContent = 'Continuar';
            modalButton.className = 'btn-primary';
        } else {
            modalIcon.className = 'fas fa-times-circle';
            modalButton.textContent = 'Entendido';
            modalButton.className = 'btn-secondary';
        }
        
        // Mostrar modal
        modal.style.display = 'flex';
        
        // Cerrar modal con el botón de cerrar
        closeModal.onclick = function() {
            modal.style.display = 'none';
            if (callback) callback();
        };
        
        // Cerrar modal con el botón principal
        modalButton.onclick = function() {
            modal.style.display = 'none';
            if (callback) callback();
        };
        
        // Cerrar modal haciendo clic fuera
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                if (callback) callback();
            }
        };
    }

    // Permitir soltar imágenes en la zona de carga (drag & drop)
    const dropArea = document.querySelector('.file-upload-label');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            elements.image.files = files;
            // Disparar el evento change manualmente
            const event = new Event('change');
            elements.image.dispatchEvent(event);
        }
    }

    // Inicializar Google Maps
    initializeGoogleMaps();
}