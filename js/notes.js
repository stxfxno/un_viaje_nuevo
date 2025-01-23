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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Referencias a elementos del DOM
const notesList = document.getElementById('notesList');
const addButton = document.getElementById('addButton');
const modal = document.getElementById('noteModal');
const closeModal = document.getElementById('closeModal');
const noteForm = document.getElementById('noteForm');
const authorSelect = document.getElementById('author');
const messageTextarea = document.getElementById('message');

// Verificar si el usuario está autenticado
auth.onAuthStateChanged(user => {
    if (!user) {
        // Si no está autenticado, redirigir a la página de login
        window.location.href = 'index.html'; // Reemplaza con tu página de login
    } else {
        // Si está autenticado, cargar las notas
        loadNotes();
    }
});

// Función para cargar las notas
function loadNotes() {
    const q = firebase.firestore().collection('notas').orderBy('timestamp', 'desc');
    q.onSnapshot(snapshot => {
        notesList.innerHTML = '';
        snapshot.forEach(doc => {
            const note = doc.data();
            const noteElement = document.createElement('div');
            noteElement.className = `note ${note.autor.toLowerCase()}-note`;
            noteElement.innerHTML = `
                <div class="note-header">
                    <span class="note-author">${note.autor}</span>
                    <span class="note-date">${note.fecha}</span>
                </div>
                <div class="note-content">${note.mensaje}</div>
            `;
            notesList.appendChild(noteElement);
        });
    });
}

// Event Listeners
addButton.addEventListener('click', () => {
    modal.classList.add('active');
});

closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
    noteForm.reset();
});

noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const today = new Date();
    const fecha = today.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    try {
        await firebase.firestore().collection('notas').add({
            mensaje: messageTextarea.value,
            autor: authorSelect.value === 'eli' ? 'Eli' : 'Stef',
            fecha: fecha,
            timestamp: today
        });

        messageTextarea.value = '';
        modal.classList.remove('active');
    } catch (error) {
        console.error("Error al añadir nota:", error);
        alert('Error al guardar la nota');
    }
});

// Cerrar modal al hacer clic fuera
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
        noteForm.reset();
    }
});