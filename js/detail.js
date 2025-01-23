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

const auth = firebase.auth();

// Verifica si el usuario está autenticado
auth.onAuthStateChanged(user => {
    if (!user) {
        // Si no está autenticado, redirige a la página de login
        window.location.href = 'index.html'; // Reemplaza 'index.html' con tu página de inicio de sesión
    } else {
        // Si está autenticado, carga las fotos
        loadPhotoDetails();
    }
});

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function getPhotoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function loadPhotoDetails() {
    const photoId = getPhotoId();
    const loading = document.getElementById('loading');
    const container = document.getElementById('detail-container');

    if (!photoId) {
        loading.className = 'error';
        loading.textContent = 'No se encontró la foto especificada';
        return;
    }

    try {
        const doc = await db.collection('viajes').doc(photoId).get();

        if (!doc.exists) {
            loading.className = 'error';
            loading.textContent = 'No se encontró la foto especificada';
            return;
        }

        const data = doc.data();
        container.innerHTML = `
            <div class="detail-card">
                <div class="image-container">
                    <img src="${data.imageUrl}" alt="Foto del viaje" class="detail-image">
                </div>
                <div class="detail-content">
                    <div class="detail-header">
                        <div class="detail-info">
                            <div class="detail-author">Subido por: ${data.author}</div>
                            <div class="detail-date">${formatDate(data.date)}</div>
                            <div class="detail-location">📍 ${data.location.formattedAddress}</div>
                        </div>
                    </div>
                    <div class="detail-description">${data.description}</div>
                    <div id="map"></div>
                </div>
            </div>
        `;

        // Inicializar el mapa
        const map = new google.maps.Map(document.getElementById('map'), {
            center: {
                lat: data.location.latitude,
                lng: data.location.longitude
            },
            zoom: 15
        });

        new google.maps.Marker({
            map: map,
            position: {
                lat: data.location.latitude,
                lng: data.location.longitude
            }
        });

        loading.style.display = 'none';
    } catch (error) {
        console.error('Error al cargar los detalles:', error);
        loading.className = 'error';
        loading.textContent = 'Error al cargar los detalles. Por favor, intenta de nuevo.';
    }
}

document.addEventListener('DOMContentLoaded', loadPhotoDetails);