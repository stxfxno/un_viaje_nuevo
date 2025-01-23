// Inicializar Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCek7bTb6WlbJw5Xjmvsk4hSvWAQ_g7yPs",
    authDomain: "un-viaje-nuevo.firebaseapp.com",
    projectId: "un-viaje-nuevo",
    storageBucket: "un-viaje-nuevo.firebasestorage.app",
    messagingSenderId: "872379280680",
    appId: "1:872379280680:web:c7b09f71760bfe44dcf41d",
    measurementId: "G-J021Q5QKX6"
};

// Inicializar Firebase usando la API de compatibilidad
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Variable global para almacenar el nombre del usuario
let userName = '';

// Obtener id_sala desde la URL
const params = new URLSearchParams(window.location.search);
const roomId = params.get('id_sala');

if (!roomId) {
    alert("ID de sala no encontrado.");
    window.location.href = "gallery_photos.html";
}

// Variables globales para el mapa y el autocomplete
let map;
let marker;
let autocomplete;

// Inicializar Google Maps y Places
function initializeGoogleMaps() {
    const mapOptions = {
        center: { lat: 0, lng: 0 },
        zoom: 2
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById('locationInput'),
        { types: ['geocode', 'establishment'] }
    );

    autocomplete.addListener('place_changed', function () {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            alert("No se encontraron detalles para este lugar");
            return;
        }

        map.setCenter(place.geometry.location);
        map.setZoom(15);

        if (marker) {
            marker.setMap(null);
        }

        marker = new google.maps.Marker({
            map: map,
            position: place.geometry.location
        });

        document.getElementById('latitude').value = place.geometry.location.lat();
        document.getElementById('longitude').value = place.geometry.location.lng();
        document.getElementById('placeId').value = place.place_id;
        document.getElementById('formattedAddress').value = place.formatted_address;
    });
}

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
                alert('No tienes acceso a esta sala.');
                window.location.href = 'dashboard.html';
                return;
            }

            const salaActual = salaQuery.docs[0];
            if (salaActual.id !== roomId) {
                alert('No tienes acceso a esta sala.');
                window.location.href = 'dashboard.html';
                return;
            }

            // Obtener el nombre del usuario desde la colección usuarios
            const userDoc = await db.collection('usuarios').doc(user.uid).get();
            if (userDoc.exists) {
                userName = userDoc.data().nombre;
                console.log('Nombre del usuario:', userName);
            } else {
                console.log('No se encontró el documento del usuario');
                userName = user.email; // Usar email como respaldo si no se encuentra el nombre
            }

        } catch (error) {
            console.error("Error verificando sala:", error);
            alert('Error verificando acceso a la sala.');
            window.location.href = 'dashboard.html';
        }
    } else {
        alert('Por favor, inicia sesión para poder subir fotos.');
        window.location.href = 'index.html';
    }
});

// Manejar el envío del formulario para subir fotos
document.getElementById('uploadForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    document.getElementById('loadingOverlay').style.display = 'flex';

    const file = document.getElementById('image').files[0];
    const description = document.getElementById('description').value;
    const date = document.getElementById('date').value;
    const location = {
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        placeId: document.getElementById('placeId').value,
        formattedAddress: document.getElementById('formattedAddress').value
    };

    try {
        // Subir imagen al Storage
        const storageRef = storage.ref(`paseos/${roomId}/${Date.now()}-${file.name}`);
        const snapshot = await storageRef.put(file);
        const imageUrl = await snapshot.ref.getDownloadURL();

        // Guardar datos en Firestore usando el nombre del usuario obtenido
        await db.collection('paseos').add({
            id_sala: roomId,
            imageUrl,
            description,
            author: userName, // Usar el nombre del usuario obtenido de la colección usuarios
            date,
            location,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('loadingOverlay').style.display = 'none';
        alert("Foto subida exitosamente.");
        window.location.href = `gallery_photos.html?id_sala=${roomId}`;

    } catch (error) {
        console.error('Error al subir:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        alert('Error al subir la foto. Por favor, intenta de nuevo.');
    }
});

// Inicializar Google Maps cuando la página cargue
document.addEventListener('DOMContentLoaded', initializeGoogleMaps);