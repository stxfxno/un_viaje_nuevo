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


async function checkAuthAndRoom() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Verificar si el usuario está en una sala activa
    const salasRef = collection(db, "salas");
    const q = query(
        salasRef, 
        where("miembros", "array-contains", user.uid),
        where("estado", "==", "activa")
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        window.location.href = 'dashboard.html';
        return;
    }
}


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

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

        document.getElementById('map').style.display = 'block';
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
auth.onAuthStateChanged(user => {
    if (user) {
        // Usuario autenticado
        document.getElementById('uploadFormContainer').style.display = 'block';
        console.log("Usuario autenticado:", user.email);
    } else {
        // Usuario no autenticado
        alert('Por favor, inicia sesión para poder subir fotos.');
        window.location.href = 'index.html'; // Redirigir a la página principal si no está autenticado
        console.log("Usuario no autenticado");
    }
});

// Manejar el envío del formulario para subir fotos
document.getElementById('uploadForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    document.getElementById('loadingOverlay').style.display = 'flex';

    const file = document.getElementById('image').files[0];
    const description = document.getElementById('description').value;
    const author = document.getElementById('author').value;
    const date = document.getElementById('date').value;
    const location = {
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        placeId: document.getElementById('placeId').value,
        formattedAddress: document.getElementById('formattedAddress').value
    };

    try {
        const storageRef = storage.ref(`fotos/${Date.now()}-${file.name}`);
        const snapshot = await storageRef.put(file);
        const imageUrl = await snapshot.ref.getDownloadURL();

        await db.collection('viajes').add({
            imageUrl,
            description,
            author,
            date,
            location,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        setTimeout(() => {
            window.location.href = 'gallery_photos.html';
        }, 1000);
    } catch (error) {
        console.error('Error al subir:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        alert('Error al subir la foto. Por favor, intenta de nuevo.');
    }
});

// Inicializar Google Maps cuando la página cargue
document.addEventListener('DOMContentLoaded', initializeGoogleMaps);