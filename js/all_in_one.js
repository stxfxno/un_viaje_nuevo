 // Configuración de Firebase
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

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const auth = firebase.auth();

// Verifica si el usuario está autenticado
auth.onAuthStateChanged(user => {
    if (!user) {
        // Si no está autenticado, redirige a la página de login
        window.location.href = 'index.html'; // Reemplaza 'index.html' con tu página de inicio de sesión
    } else {
        // Si está autenticado, carga las fotos
        loadPlaces();
    }
});

// Variables globales
let map;
let markers = [];
let bounds;
let activeInfoWindow = null;

// Inicializar el mapa
function initMap() {
    const mapOptions = {
        center: { lat: -12.0464, lng: -77.0428 },
        zoom: 6,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    };

    map = new google.maps.Map(document.getElementById("map"), mapOptions);
    bounds = new google.maps.LatLngBounds();
    loadPlaces();
}

// Cargar lugares
async function loadPlaces() {
    const list = document.getElementById("list");
    const totalPlaces = document.getElementById("total-places");
    const viajesCollection = await db.collection("viajes").orderBy("timestamp", "desc").get();

    totalPlaces.textContent = `Total: ${viajesCollection.size} lugares`;

    viajesCollection.forEach(doc => {
        const data = doc.data();
        const { formattedAddress, latitude, longitude } = data.location;
        const date = data.timestamp.toDate();

        // Crear elemento de lista
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${formattedAddress}</strong>
            <div>Visitado por: ${data.author}</div>
            <small>${date.toLocaleDateString("es-ES", {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</small>
        `;

        // Crear marcador e info window
        const marker = new google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: map,
            title: formattedAddress,
            animation: google.maps.Animation.DROP
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px;">
                    <img src="${data.imageUrl}" alt="Foto del lugar" style="width: 100%; height: auto; max-height: 300px; object-fit: cover;">
                    <h3 style="margin: 0 0 5px;">${formattedAddress}</h3>
                    <p style="margin: 0;">Visitado por: ${data.author}</p>
                </div>
            `
        });

        // Eventos del marcador
        marker.addListener("click", () => {
            if (activeInfoWindow) activeInfoWindow.close();
            infoWindow.open(map, marker);
            activeInfoWindow = infoWindow;
            focusOnPlace({ lat: latitude, lng: longitude }, marker);
        });

        // Eventos del elemento de lista
        li.addEventListener("click", () => {
            if (activeInfoWindow) activeInfoWindow.close();
            infoWindow.open(map, marker);
            activeInfoWindow = infoWindow;
            focusOnPlace({ lat: latitude, lng: longitude }, marker);

            // En móvil, cerrar la lista al seleccionar un lugar
            if (window.innerWidth <= 768) {
                document.getElementById("list-container").classList.remove("expanded");
            }
        });

        markers.push(marker);
        bounds.extend(marker.position);
        list.appendChild(li);
    });

    map.fitBounds(bounds);
}

// Centrar en un lugar
function focusOnPlace(location, selectedMarker) {
    map.panTo(location);
    map.setZoom(15);

    markers.forEach(marker => {
        marker.setAnimation(null);
    });

    selectedMarker.setAnimation(google.maps.Animation.BOUNCE);
}

// Eventos
document.getElementById("reset-btn").addEventListener("click", () => {
    if (activeInfoWindow) activeInfoWindow.close();
    map.fitBounds(bounds);
    markers.forEach(marker => marker.setAnimation(null));
});

// Funcionalidad móvil
const listContainer = document.getElementById("list-container");
const containerHeader = document.querySelector(".container-header");
const menuToggle = document.getElementById("menu-toggle");

function toggleList() {
    listContainer.classList.toggle("expanded");
}

containerHeader.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
        toggleList();
    }
});

menuToggle.addEventListener("click", toggleList);

// Inicializar
window.onload = initMap;