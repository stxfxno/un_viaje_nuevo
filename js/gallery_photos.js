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


// Inicializa Firebase
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
        loadPhotos();
    }
});

// Función para cargar las fotos
function loadPhotos() {
    const gallery = document.getElementById('gallery');
    const loading = document.getElementById('loading');

    try {
        db.collection('viajes')
            .orderBy('timestamp', 'desc')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    loading.textContent = 'No hay fotos disponibles';
                    return;
                }

                loading.style.display = 'none';
                snapshot.forEach(doc => {
                    gallery.appendChild(createPhotoCard(doc));
                });

                // Añadir animación de entrada a las tarjetas
                const cards = document.querySelectorAll('.card');
                cards.forEach((card, index) => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            });
    } catch (error) {
        console.error('Error al cargar las fotos:', error);
        loading.textContent = 'Error al cargar las fotos. Por favor, recarga la página.';
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function createPhotoCard(doc) {
    const data = doc.data();
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `detail.html?id=${doc.id}`;

    card.innerHTML = `
        <img src="${data.imageUrl}" alt="Foto del viaje" class="card-image">
        <div class="card-content">
            <div class="card-author">Subido por: ${data.author}</div>
            <div class="card-date">${formatDate(data.date)}</div>
            <div class="card-description">${data.description}</div>
            <div class="location-text">${data.location.formattedAddress}</div>
        </div>
    `;
    return card;
}