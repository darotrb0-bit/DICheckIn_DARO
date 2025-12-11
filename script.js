// ============================================
// 1. IMPORTS & DEPENDENCIES
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  onSnapshot,
  setLogLevel,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getDatabase,
  ref,
  onValue,
  get
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// ============================================
// 2. GLOBAL VARIABLES & CONFIG
// ============================================
let dbAttendance, dbLeave, dbEmployeeList, dbShift, authAttendance;
let allEmployees = [];
let currentMonthRecords = [];
let attendanceRecords = [];
let leaveRecords = [];
let currentUser = null;
let currentUserShift = null;
let attendanceCollectionRef = null;
let attendanceListener = null;
let leaveCollectionListener = null;
let outCollectionListener = null;
let sessionCollectionRef = null;
let sessionListener = null;
let currentDeviceId = null;
let modelsLoaded = false;
let currentUserFaceMatcher = null;
let currentScanAction = null;
let videoStream = null;
let isScanning = false;
let profileFaceError = false;

// 🔄 Liveness Check Variables
let livenessStep = 0; // 0: Match, 1: Smile, 2: Turn Left, 3: Turn Right

// ✅ Setting Thresholds
const FACE_MATCH_THRESHOLD = 0.4; 
const SMILE_THRESHOLD = 0.05; // កម្រិតញញឹម (Low for easier detection)
const HEAD_TURN_LEFT_THRESHOLD = 0.6; // ងាកឆ្វេង (Ratio > 0.6)
const HEAD_TURN_RIGHT_THRESHOLD = 0.4; // ងាកស្តាំ (Ratio < 0.4)

const PLACEHOLDER_IMG = "https://placehold.co/80x80/e2e8f0/64748b?text=No+Img"; 

const shiftSettings = {
  "ពេញម៉ោង": {
    startCheckIn: "07:00 AM",
    endCheckIn: "10:15 AM",
    startCheckOut: "04:30 PM",
    endCheckOut: "11:50 PM"
  },
  "ពេលយប់": {
    startCheckIn: "05:00 PM",
    endCheckIn: "07:50 PM",
    startCheckOut: "08:55 PM",
    endCheckOut: "11:50 PM"
  },
  "មួយព្រឹក": {
    startCheckIn: "07:00 AM",
    endCheckIn: "10:15 AM",
    startCheckOut: "11:30 AM",
    endCheckOut: "11:50 PM"
  },
  "មួយរសៀល": {
    startCheckIn: "12:00 PM",
    endCheckIn: "02:30 PM",
    startCheckOut: "05:30 PM",
    endCheckOut: "11:50 PM"
  }
};

const allowedAreaCoords = [
  [11.415206789703271, 104.7642005060435],
  [11.41524294053174, 104.76409925265823],
  [11.413750665249953, 104.7633762203053],
  [11.41370399757057, 104.7634714387206],
];

// --- Firebase Configurations ---

const firebaseConfigAttendance = {
  apiKey: "AIzaSyCgc3fq9mDHMCjTRRHD3BPBL31JkKZgXFc",
  authDomain: "checkme-10e18.firebaseapp.com",
  databaseURL: "https://checkme-10e18-default-rtdb.firebaseio.com",
  projectId: "checkme-10e18",
  storageBucket: "checkme-10e18.firebasestorage.app",
  messagingSenderId: "1030447497157",
  appId: "1:1030447497157:web:9792086df1e864559fd5ac",
  measurementId: "G-QCJ2JH4WH6",
};

const firebaseConfigLeave = {
  apiKey: "AIzaSyDjr_Ha2RxOWEumjEeSdluIW3JmyM76mVk",
  authDomain: "dipermisstion.firebaseapp.com",
  projectId: "dipermisstion",
  storageBucket: "dipermisstion.firebasestorage.app",
  messagingSenderId: "512999406057",
  appId: "1:512999406057:web:953a281ab9dde7a9a0f378",
  measurementId: "G-KDPHXZ7H4B",
};

const firebaseConfigEmployeeList = {
  apiKey: "AIzaSyAc2g-t9A7du3K_nI2fJnw_OGxhmLfpP6s",
  authDomain: "dilistname.firebaseapp.com",
  databaseURL: "https://dilistname-default-rtdb.firebaseio.com",
  projectId: "dilistname",
  storageBucket: "dilistname.firebasestorage.app",
  messagingSenderId: "897983357871",
  appId: "1:897983357871:web:42a046bc9fb3e0543dc55a",
  measurementId: "G-NQ798D9J6K"
};

// ============================================
// 3. DOM ELEMENTS
// ============================================
const $ = (id) => document.getElementById(id);

const loadingView = $("loadingView");
const employeeListView = $("employeeListView");
const homeView = $("homeView");
const historyView = $("historyView");
const footerNav = $("footerNav");
const navHomeButton = $("navHomeButton");
const navHistoryButton = $("navHistoryButton");
const searchInput = $("searchInput");
const employeeListContainer = $("employeeListContainer");
const welcomeMessage = $("welcomeMessage");
const logoutButton = $("logoutButton");
const exitAppButton = $("exitAppButton");
const profileImage = $("profileImage");
const profileName = $("profileName");
const profileId = $("profileId");
const profileDepartment = $("profileDepartment");
const profileGroup = $("profileGroup");
const profileShift = $("profileShift");

const actionButtonContainer = $("actionButtonContainer");
const actionBtnBg = $("actionBtnBg");
const actionBtnTitle = $("actionBtnTitle");
const actionBtnSubtitle = $("actionBtnSubtitle");
const actionBtnIcon = $("actionBtnIcon");
const statusMessageContainer = $("statusMessageContainer");
const statusTitle = $("statusTitle");
const statusDesc = $("statusDesc");
const statusIcon = $("statusIcon");
const statusIconBg = $("statusIconBg");
const noShiftContainer = $("noShiftContainer");
const todayActivitySection = $("todayActivitySection");
const shiftStatusIndicator = $("shiftStatusIndicator");

const historyContainer = $("historyContainer");
const monthlyHistoryContainer = $("monthlyHistoryContainer");
const customModal = $("customModal");
const cameraModal = $("cameraModal");
const videoElement = $("videoElement");
const cameraCloseButton = $("cameraCloseButton");
const cameraLoadingText = $("cameraLoadingText");
const captureButton = $("captureButton");
const employeeListHeader = $("employeeListHeader");
const employeeListContent = $("employeeListContent");

// ============================================
// 4. HELPER FUNCTIONS
// ============================================

function changeView(viewId) {
  [loadingView, employeeListView, homeView, historyView].forEach(v => {
      if (v) v.style.display = "none";
  });
  const view = $(viewId);
  if (view) view.style.display = "flex";
  if (viewId === "homeView" || viewId === "historyView") {
    if(footerNav) footerNav.style.display = "block";
  } else {
    if(footerNav) footerNav.style.display = "none";
  }
}

function showMessage(title, message, isError = false) {
  const iconColor = isError ? "text-red-500" : "text-blue-500";
  const bgColor = isError ? "bg-red-50" : "bg-blue-50";
  const iconName = isError ? "ph-warning-circle" : "ph-info";

  const modalContent = `
    <div class="modal-box-design">
      <div class="status-icon-wrapper ${bgColor} ${iconColor}">
        <i class="ph-fill ${iconName}"></i>
      </div>
      <h3 class="modal-title-text">${title}</h3>
      <p class="modal-body-text">${message}</p>
      <button id="modalConfirmButtonAction" class="modal-btn modal-btn-primary">
        យល់ព្រម
      </button>
    </div>
  `;

  if(customModal) {
      customModal.innerHTML = modalContent;
      const btn = $("modalConfirmButtonAction");
      if(btn) btn.onclick = hideMessage;
      customModal.classList.remove("modal-hidden");
      customModal.classList.add("modal-visible");
  }
}

function showConfirmation(title, message, confirmText, onConfirm) {
  const modalContent = `
    <div class="modal-box-design">
      <div class="status-icon-wrapper bg-orange-50 text-orange-500">
        <i class="ph-fill ph-question"></i>
      </div>
      <h3 class="modal-title-text">${title}</h3>
      <p class="modal-body-text">${message}</p>
      <div class="grid grid-cols-2 gap-3">
        <button id="modalCancelBtn" class="modal-btn modal-btn-secondary">
          បោះបង់
        </button>
        <button id="modalOkBtn" class="modal-btn modal-btn-primary bg-gradient-to-r from-red-500 to-pink-600 shadow-red-200">
          ${confirmText}
        </button>
      </div>
    </div>
  `;
  
  if(customModal) {
      customModal.innerHTML = modalContent;
      $("modalCancelBtn").onclick = hideMessage;
      $("modalOkBtn").onclick = onConfirm;
      customModal.classList.remove("modal-hidden");
      customModal.classList.add("modal-visible");
  }
}

function hideMessage() {
  if(customModal) {
      customModal.classList.add("modal-hidden");
      customModal.classList.remove("modal-visible");
  }
}

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  try {
    const day = String(date.getDate()).padStart(2, "0");
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) { return ""; }
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

function parseTimeStringToDecimal(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleanStr = timeStr.replace(/[^a-zA-Z0-9:]/g, ''); 
  const match = cleanStr.match(/(\d+):(\d+)(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  else if (ampm === "AM" && hours === 12) hours = 0;
  return hours + (minutes / 60);
}

function checkShiftTime(shiftType, checkType) {
  if (!shiftType || shiftType === "N/A" || shiftType === "None") return false;
  if (shiftType === "Uptime") return true;

  const settings = shiftSettings[shiftType];
  if (!settings) return false;

  let startStr, endStr;
  if (checkType === "checkIn") {
    startStr = settings.startCheckIn;
    endStr = settings.endCheckIn;
  } else {
    startStr = settings.startCheckOut;
    endStr = settings.endCheckOut;
  }

  if (!startStr || !endStr) return false;

  const minTime = parseTimeStringToDecimal(startStr);
  const maxTime = parseTimeStringToDecimal(endStr);
  
  if (minTime === null || maxTime === null) return false;

  const now = new Date();
  const currentTime = now.getHours() + now.getMinutes() / 60;

  if (minTime > maxTime) {
    return currentTime >= minTime || currentTime <= maxTime;
  } else {
    return currentTime >= minTime && currentTime <= maxTime;
  }
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("កម្មវិធីមិនគាំទ្រការប្រើប្រាស់ទីតាំងលើឧបករណ៍នេះទេ"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (error) => {
          let msg = "សូមបើក Location";
          switch(error.code) {
              case error.PERMISSION_DENIED:
                  msg = "សូមបើក Location ក្នុង Setting។";
                  break;
              case error.POSITION_UNAVAILABLE:
                  msg = "មិនអាចស្វែងរកទីតាំងបានទេ។";
                  break;
              case error.TIMEOUT:
                  msg = "ការស្វែងរកទីតាំងចំណាយពេលយូរពេក។";
                  break;
          }
          reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function isInsideArea(lat, lon) {
  const polygon = allowedAreaCoords;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const viy = polygon[i][0], vix = polygon[i][1];
    const vjy = polygon[j][0], vjx = polygon[j][1];
    if ((viy > lat) !== (vjy > lat) && lon < ((vjx - vix) * (lat - viy)) / (vjy - viy) + vix) {
      isInside = !isInside;
    }
  }
  return isInside;
}

// ============================================
// 5. DATA PROCESSING & RENDERING
// ============================================

function mergeAttendanceAndLeave(attendanceRecords, leaveRecords) {
  const mergedMap = new Map();
  attendanceRecords.forEach(r => mergedMap.set(r.date, { ...r }));
  return Array.from(mergedMap.values());
}

async function mergeAndRenderHistory() {
  currentMonthRecords = mergeAttendanceAndLeave(attendanceRecords, leaveRecords);
  
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, "0");
  const currentYearStr = String(now.getFullYear());
  const monthPrefix = `${currentYearStr}-${currentMonthStr}`;

  currentMonthRecords = currentMonthRecords.filter(r => r.date.startsWith(monthPrefix));

  const todayString = getTodayDateString();
  
  currentMonthRecords.sort((a, b) => {
    if (a.date === todayString) return -1;
    if (b.date === todayString) return 1;
    return b.date.localeCompare(a.date);
  });

  renderTodayHistory();
  renderMonthlyHistory();
  updateButtonState(); 
}

function renderTodayHistory() {
  if (!historyContainer) return;
  historyContainer.innerHTML = "";

  const todayString = getTodayDateString();
  const todayRecord = currentMonthRecords.find(
    (record) => record.date === todayString
  );

  const card = document.createElement("div");
  card.className = "animate-slide-up bg-white/80 backdrop-blur-md p-5 rounded-[1.8rem] border border-blue-50 shadow-sm card-hover-effect";

  if (!todayRecord) {
    card.innerHTML = `
      <div class="flex flex-col items-center justify-center py-6 text-slate-300">
        <i class="ph-duotone ph-clipboard-text text-4xl mb-2 opacity-50"></i>
        <p class="text-xs font-medium">មិនទាន់មានទិន្នន័យថ្ងៃនេះ</p>
      </div>
    `;
  } else {
    const checkIn = todayRecord.checkIn || "--:--";
    const checkOut = todayRecord.checkOut || "មិនទាន់ចេញ";
    const ciColor = todayRecord.checkIn ? "text-green-600 bg-green-50" : "text-slate-400 bg-slate-50";
    const coColor = todayRecord.checkOut ? "text-red-500 bg-red-50" : "text-slate-400 bg-slate-50";

    card.innerHTML = `
       <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-600 text-[10px] font-bold uppercase tracking-wider">Today</span>
            <span class="text-xs text-slate-400 font-medium">${todayRecord.formattedDate}</span>
          </div>
       </div>
       <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col items-center p-3 rounded-2xl ${ciColor} transition-all">
             <span class="text-[10px] opacity-70 mb-1">ចូល</span>
             <span class="text-lg font-bold tracking-tight">${checkIn}</span>
          </div>
          <div class="flex flex-col items-center p-3 rounded-2xl ${coColor} transition-all">
             <span class="text-[10px] opacity-70 mb-1">ចេញ</span>
             <span class="text-sm font-bold tracking-tight mt-1">${checkOut}</span>
          </div>
       </div>
    `;
  }
  historyContainer.appendChild(card);
}

function renderMonthlyHistory() {
  if (!monthlyHistoryContainer) return;
  monthlyHistoryContainer.innerHTML = "";

  if (currentMonthRecords.length === 0) {
    monthlyHistoryContainer.innerHTML = `<p class="text-center py-10 text-slate-400">មិនទាន់មានទិន្នន័យសម្រាប់ខែនេះ</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  currentMonthRecords.forEach((record, i) => {
    const checkIn = record.checkIn ? record.checkIn : "---";
    const checkOut = record.checkOut ? record.checkOut : "---";
    const ciClass = record.checkIn ? "text-blue-600" : "text-slate-400";
    const coClass = record.checkOut ? "text-blue-600" : "text-slate-400";
    const isToday = record.date === getTodayDateString();
    const bgClass = isToday ? "bg-blue-50 border-blue-100" : "bg-white border-slate-50";

    const card = document.createElement("div");
    card.className = `${bgClass} p-4 rounded-2xl shadow-sm border mb-3 list-item-anim`;
    card.style.animationDelay = `${i * 0.05}s`;

    card.innerHTML = `
        <div class="flex justify-between items-center mb-3">
           <p class="text-sm font-bold text-slate-800">
             ${record.formattedDate || record.date}
             ${isToday ? '<span class="ml-2 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">Today</span>' : ''}
           </p>
        </div>
        <div class="flex flex-col space-y-2 text-sm">
          <div class="flex justify-between border-b border-gray-100 pb-1">
            <span class="text-slate-500">ចូល</span>
            <span class="${ciClass} font-medium">${checkIn}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">ចេញ</span>
            <span class="${coClass} font-medium">${checkOut}</span>
          </div>
        </div>
    `;
    fragment.appendChild(card);
  });
  monthlyHistoryContainer.appendChild(fragment);
}

function renderEmployeeList(employees) {
  if(!employeeListContainer) return;
  employeeListContainer.innerHTML = "";
  employeeListContainer.classList.remove("hidden");

  if (employees.length === 0) {
    employeeListContainer.innerHTML = `<p class="text-center text-gray-500 p-3">រកមិនឃើញ។</p>`;
    return;
  }
  
  const fragment = document.createDocumentFragment();
  employees.forEach((emp) => {
    const card = document.createElement("div");
    card.className = "flex items-center p-3 rounded-xl cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm mb-2 bg-white border border-slate-50";
    card.innerHTML = `
      <img src="${emp.photoUrl || PLACEHOLDER_IMG}" 
           class="w-12 h-12 rounded-full object-cover border-2 border-slate-100 mr-3 bg-slate-200"
           loading="lazy"
           onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
      <div>
           <h3 class="text-sm font-bold text-slate-800">${emp.name}</h3>
           <p class="text-xs text-slate-500">ID: ${emp.id}</p>
      </div>
    `;
    card.onmousedown = () => selectUser(emp);
    fragment.appendChild(card);
  });
  employeeListContainer.appendChild(fragment);
}

// ============================================
// 6. FIREBASE & LOGIC LISTENERS
// ============================================

function setupAttendanceListener() {
  if (!attendanceCollectionRef) return;
  if (attendanceListener) attendanceListener();

  attendanceListener = onSnapshot(attendanceCollectionRef, (querySnapshot) => {
    let allRecords = [];
    querySnapshot.forEach((doc) => allRecords.push(doc.data()));
    
    attendanceRecords = allRecords; 
    currentMonthRecords = mergeAttendanceAndLeave(attendanceRecords, leaveRecords);
    
    // Call mergeAndRenderHistory to apply filtering
    mergeAndRenderHistory(); 

    const actionArea = $("dynamicActionArea");
    const activityArea = $("todayActivitySection");
    
    if (actionArea && activityArea) {
      actionArea.style.transition = "opacity 0.5s ease";
      activityArea.style.transition = "opacity 0.5s ease 0.1s";
      requestAnimationFrame(() => {
        actionArea.style.opacity = "1";
        activityArea.style.opacity = "1";
      });
    }
  });
}

function startLeaveListeners() {
  if (!dbLeave || !currentUser) {
    console.log("Leave Database not ready or User not selected.");
    return;
  }
  const employeeId = currentUser.id;
  const reFetch = async () => { mergeAndRenderHistory(); };

  try {
    const qLeave = query(
      collection(dbLeave, "artifacts/default-app-id/public/data/leave_requests"), 
      where("userId", "==", employeeId)
    );
    leaveCollectionListener = onSnapshot(qLeave, reFetch);

    const qOut = query(
      collection(dbLeave, "artifacts/default-app-id/public/data/out_requests"),
      where("userId", "==", employeeId)
    );
    outCollectionListener = onSnapshot(qOut, reFetch);
  } catch (error) {
    console.error("Error connecting to Leave DB:", error);
  }
}

function startSessionListener(employeeId) {
  if (sessionListener) sessionListener();
  const sessionDocRef = doc(sessionCollectionRef, employeeId);
  sessionListener = onSnapshot(sessionDocRef, (docSnap) => {
    if (!docSnap.exists()) { forceLogout("Session បានបញ្ចប់។"); return; }
    const sessionData = docSnap.data();
    if (localStorage.getItem("currentDeviceId") && sessionData.deviceId !== localStorage.getItem("currentDeviceId")) {
      forceLogout("គណនីកំពុងប្រើនៅកន្លែងផ្សេង។");
    }
  });
}

// ============================================
// 7. FACE & CAMERA LOGIC
// ============================================

async function loadAIModels() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
      // ✅ Add Expression Net for Smile Detection
      faceapi.nets.faceExpressionNet.loadFromUri("./models")
    ]);
    modelsLoaded = true;
  } catch (e) {
    console.error("Error loading models:", e);
  }
}

// ✅ កែសម្រួល៖ ប្រើរូបភាពពី DOM ផ្ទាល់ ជំនួសឱ្យការ Download ថ្មី
async function prepareFaceMatcher(imgElement) {
  currentUserFaceMatcher = null;
  profileFaceError = false; 
  if (!imgElement) return;
  
  try {
    // ប្រើរូបភាពដែល Load រួចស្រាប់នៅក្នុង HTML
    const detection = await faceapi.detectSingleFace(imgElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    
    if (detection) {
        currentUserFaceMatcher = new faceapi.FaceMatcher(detection.descriptor);
        console.log("Face Matcher Ready");
    } else {
        console.warn("No face detected in profile image.");
        profileFaceError = true; 
    }
  } catch (e) { 
      console.error("Error preparing face matcher:", e);
      profileFaceError = true;
  }
}

async function startFaceScan(action) {
  currentScanAction = action;
  livenessStep = 0; // ✅ Reset Step

  if (!modelsLoaded) { 
      showMessage("Notice", "AI មិនទាន់ដំណើរការ (Models not found)."); 
      return; 
  }
  
  if(cameraModal) {
      cameraModal.classList.remove("modal-hidden");
      cameraModal.classList.add("modal-visible");
  }
  
  try {
    let stream;
    try {
        // ព្យាយាមបើកកាមេរ៉ាជាមួយការកំណត់ល្អ (Resolution ខ្ពស់)
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
        });
    } catch (e) {
        console.warn("High-res camera failed, trying basic...", e);
        // បើបរាជ័យ (ដូជានៅលើ Telegram ខ្លះ) ព្យាយាមបើកតាមរបៀបធម្មតា
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }

    videoStream = stream;

    if(videoElement) {
        videoElement.srcObject = videoStream;
        // Telegram/Webview ត្រូវការ play() ច្បាស់លាស់
        videoElement.setAttribute("playsinline", "true"); 
        await videoElement.play().catch(e => console.error("Play error:", e));

        isScanning = true;
        livenessStep = 0; // Reset step
        
        // រង់ចាំវីដេអូដើរស្រួលបួលសិន
        if (videoElement.readyState >= 3) { // HAVE_FUTURE_DATA
             scanLoop();
        } else {
             videoElement.oncanplay = () => scanLoop();
        }
    }
  } catch (err) {
    console.error("Camera Error:", err);
    let msg = "កាមេរ៉ាមានបញ្ហា";
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "សូមអនុញ្ញាត (Allow) ឱ្យប្រើកាមេរ៉ានៅក្នុង Settings។";
    }
    showMessage("Error", msg);
    hideCameraModal();
  }
}

function stopCamera() {
  isScanning = false;
  if (videoStream) videoStream.getTracks().forEach(t => t.stop());
  if (videoElement) videoElement.srcObject = null;
}

function hideCameraModal() {
  stopCamera();
  if(cameraModal) {
      cameraModal.classList.add("modal-hidden");
      cameraModal.classList.remove("modal-visible");
  }
}

async function scanLoop() {
    if (!isScanning) return;
    
    if (profileFaceError) {
        if(cameraLoadingText) {
            cameraLoadingText.textContent = "រូប Profile មើលមិនច្បាស់ (រកមុខមិនឃើញ)";
            cameraLoadingText.className = "text-red-500 font-bold text-lg mb-1";
        }
        return; 
    }
    
    if (videoElement.paused || videoElement.ended || !faceapi.nets.tinyFaceDetector.params) {
        return setTimeout(scanLoop, 100);
    }

    // Adjust thresholds based on step: when turning head, recognition score drops, so we relax threshold
    const currentMatchThreshold = livenessStep > 0 ? 0.65 : FACE_MATCH_THRESHOLD;

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    // Include expressions if loaded
    let detection;
    try {
      if (faceapi.nets.faceExpressionNet.params) {
          detection = await faceapi.detectSingleFace(videoElement, options).withFaceLandmarks().withFaceDescriptor().withFaceExpressions();
      } else {
          detection = await faceapi.detectSingleFace(videoElement, options).withFaceLandmarks().withFaceDescriptor();
      }
    } catch(e) {
      console.error("Detect error", e);
      return setTimeout(scanLoop, 100);
    }


    if (!detection) {
        if(cameraLoadingText) {
            cameraLoadingText.textContent = "កំពុងស្វែងរកមុខ...";
            cameraLoadingText.className = "text-white font-bold text-lg mb-1";
        }
        return setTimeout(scanLoop, 30);
    }

    if (!currentUserFaceMatcher) {
         if(cameraLoadingText) cameraLoadingText.textContent = "កំពុងរៀបចំទិន្នន័យមុខ...";
         return setTimeout(scanLoop, 500);
    }

    const match = currentUserFaceMatcher.findBestMatch(detection.descriptor);
    
    // Check Identity (with dynamic threshold)
    if (match.distance > currentMatchThreshold) {
        if(cameraLoadingText) {
            cameraLoadingText.textContent = "មុខមិនត្រូវគ្នា (" + Math.round((1 - match.distance) * 100) + "%)";
            cameraLoadingText.className = "text-red-500 font-bold text-lg mb-1";
        }
        // Only reset step if match is VERY poor (totally wrong person)
        if(match.distance > 0.7) {
            livenessStep = 0; 
        }
        setTimeout(scanLoop, 100);
        return;
    }

    // If matched, proceed with Liveness Steps
    const landmarks = detection.landmarks;
    // Nose tip: index 30. Left cheek: 0. Right cheek: 16.
    const noseX = landmarks.positions[30].x;
    const leftFaceX = landmarks.positions[0].x;  
    const rightFaceX = landmarks.positions[16].x; 
    
    // Ratio 0.5 is center. 
    // Looking Left (user's left) -> Nose moves right on image -> Ratio increases (>0.5)
    // Looking Right (user's right) -> Nose moves left on image -> Ratio decreases (<0.5)
    const faceTurnRatio = (noseX - leftFaceX) / (rightFaceX - leftFaceX);

    if (livenessStep === 0) {
        // Matched! Move to Smile
        livenessStep = 1;
    }

    if (livenessStep === 1) {
        if(cameraLoadingText) {
            cameraLoadingText.textContent = "សូមញញឹមបន្តិច (Smile)";
            cameraLoadingText.className = "text-yellow-400 font-bold text-lg mb-1 animate-pulse";
        }

        let isSmiling = false;
        if (detection.expressions && detection.expressions.happy > SMILE_THRESHOLD) {
            isSmiling = true;
        } 

        if (isSmiling) {
             livenessStep = 2; // Move to Turn Left
        }
    }
    else if (livenessStep === 2) {
        if(cameraLoadingText) {
            cameraLoadingText.textContent = "សូមងាកឆ្វេង (Turn Left)";
            cameraLoadingText.className = "text-blue-400 font-bold text-lg mb-1 animate-pulse";
        }

        // Check Turn Left (Ratio increases > 0.6)
        if (faceTurnRatio > HEAD_TURN_LEFT_THRESHOLD) { 
             livenessStep = 3; // Move to Turn Right
        }
    }
    else if (livenessStep === 3) {
        if(cameraLoadingText) {
            cameraLoadingText.textContent = "សូមងាកស្តាំ (Turn Right)";
            cameraLoadingText.className = "text-blue-400 font-bold text-lg mb-1 animate-pulse";
        }

        // Check Turn Right (Ratio decreases < 0.4)
        if (faceTurnRatio < HEAD_TURN_RIGHT_THRESHOLD) { 
             livenessStep = 4; // Done
        }
    }
    else if (livenessStep === 4) {
        if(cameraLoadingText) {
            cameraLoadingText.textContent = "ជោគជ័យ!";
            cameraLoadingText.className = "text-green-400 font-bold text-lg mb-1 animate-pulse";
        }
        isScanning = false;
        processScanSuccess();
        return;
    }

    setTimeout(scanLoop, 30);
}

function processScanSuccess() {
    if(cameraLoadingText) cameraLoadingText.innerHTML = '<span class="text-green-400">ជោគជ័យ!</span>';
    setTimeout(() => {
        hideCameraModal();
        if (currentScanAction === "checkIn") handleCheckIn();
        else handleCheckOut();
    }, 800);
}

// ============================================
// 8. CHECK-IN / CHECK-OUT LOGIC
// ============================================

async function handleCheckIn() {
  if(actionBtnTitle) actionBtnTitle.textContent = "កំពុងដំណើរការ...";
  
  try {
     const coords = await getUserLocation();
     if (!isInsideArea(coords.latitude, coords.longitude)) {
         showMessage("ទីតាំង", "អ្នកនៅក្រៅបរិវេណក្រុមហ៊ុន");
         updateButtonState();
         return;
     }
     
     const now = new Date();
     const todayDocId = getTodayDateString(now);
     
     await setDoc(doc(attendanceCollectionRef, todayDocId), {
       employeeId: currentUser.id,
       employeeName: currentUser.name,
       department: currentUser.department,
       shift: currentUserShift,
       date: todayDocId,
       checkInTimestamp: now.toISOString(),
       formattedDate: formatDate(now),
       checkIn: formatTime(now),
       checkInLocation: { lat: coords.latitude, lon: coords.longitude }
     });
     
  } catch (e) {
     showMessage("Error", e.message, true);
     updateButtonState();
  }
}

async function handleCheckOut() {
  if (actionBtnTitle) actionBtnTitle.textContent = "កំពុងដំណើរការ...";

  try {
    const coords = await getUserLocation();
    if (!isInsideArea(coords.latitude, coords.longitude)) {
      showMessage("ទីតាំង", "អ្នកនៅក្រៅបរិវេណក្រុមហ៊ុន");
      updateButtonState();
      return;
    }

    const now = new Date();
    const todayDocId = getTodayDateString(now);
    
    await setDoc(doc(attendanceCollectionRef, todayDocId), {
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      department: currentUser.department,
      shift: currentUserShift,
      date: todayDocId,
      formattedDate: formatDate(now),
      checkOutTimestamp: now.toISOString(),
      checkOut: formatTime(now),
      checkOutLocation: { lat: coords.latitude, lon: coords.longitude },
    }, { merge: true });

  } catch (e) {
    showMessage("Error", e.message, true);
    updateButtonState();
  }
}

function showActionButton(title, subtitle, icon, gradientClass, action) {
    if(!actionButtonContainer) return;
    actionButtonContainer.classList.remove('hidden');
    
    actionBtnTitle.textContent = title;
    actionBtnTitle.className = "text-xl font-bold text-white tracking-wide"; 
    
    actionBtnSubtitle.textContent = subtitle;
    actionBtnSubtitle.className = "text-blue-100 text-[11px] font-medium opacity-90"; 
    
    actionBtnIcon.className = `ph-bold ${icon} text-2xl text-white`; 
    
    actionBtnBg.className = `absolute inset-0 bg-gradient-to-r ${gradientClass} shadow-lg transition-all duration-500`;
    
    const currentBtn = $('mainActionButton');
    if (currentBtn) {
        currentBtn.onclick = () => startFaceScan(action);
        if(action === 'checkIn') {
             currentBtn.className = "w-full group relative overflow-hidden rounded-[1.8rem] p-1 shadow-lg shadow-blue-300/50 transition-all active:scale-95 hover:shadow-xl btn-pulse";
        } else {
             currentBtn.className = "w-full group relative overflow-hidden rounded-[1.8rem] p-1 shadow-lg shadow-red-300/50 transition-all active:scale-95 hover:shadow-xl btn-pulse";
        }
    }
}

function showStatusMessage(title, desc, icon, iconBgClass) {
    if(!statusMessageContainer) return;
    statusMessageContainer.classList.remove('hidden');
    statusTitle.textContent = title;
    statusDesc.textContent = desc;
    statusIcon.className = `ph-duotone ${icon} text-3xl`;
    statusIconBg.className = `w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${iconBgClass}`;
}

async function updateButtonState() {
  const todayString = getTodayDateString();
  const todayData = currentMonthRecords.find((r) => r.date === todayString);
  const shift = currentUserShift;
  const hasShift = shift && shift !== "N/A" && shift !== "None";

  if (actionButtonContainer) actionButtonContainer.classList.add("hidden");
  if (statusMessageContainer) statusMessageContainer.classList.add("hidden");
  if (noShiftContainer) noShiftContainer.classList.add("hidden");
  if (shiftStatusIndicator) shiftStatusIndicator.classList.add("hidden");

  if (!hasShift) {
    if (noShiftContainer) noShiftContainer.classList.remove("hidden");
    return;
  }

  const canCheckIn = checkShiftTime(shift, "checkIn");
  const canCheckOut = checkShiftTime(shift, "checkOut");

  // 1. Check if already checked out
  if (todayData && todayData.checkOut) {
    showStatusMessage(
      "កត់ត្រារួចរាល់",
      "អ្នកបាន Check Out រួចរាល់ហើយ",
      "ph-check-circle",
      "bg-green-100 text-green-600"
    );
    return;
  }

  // 2. Logic for Check In/Out
  if (todayData && todayData.checkIn) {
    // Already Checked In
    if (canCheckOut) {
      showActionButton(
        "Check Out",
        "ចុចទីនេះដើម្បីចាកចេញ",
        "ph-sign-out",
        "from-orange-500 to-red-600", // Vivid Orange/Red Gradient
        "checkOut"
      );
    } else {
      showStatusMessage(
        "កំពុងបំពេញការងារ",
        "រង់ចាំដល់ម៉ោងចេញពីការងារ",
        "ph-hourglass",
        "bg-blue-100 text-blue-600"
      );
      if(statusIcon) statusIcon.classList.add("animate-breathe");
    }
  } else {
    // Not Checked In
    if (canCheckIn) {
      showActionButton(
        "Check In",
        "ចុចទីនេះដើម្បីចូលធ្វើការ",
        "ph-sign-in",
        "from-blue-600 to-indigo-600", // Vivid Blue/Indigo Gradient
        "checkIn"
      );
    } else if (canCheckOut) {
      showActionButton(
        "Check Out",
        "អ្នកមិនបាន Check In (ចុចដើម្បីចេញ)",
        "ph-sign-out",
        "from-orange-500 to-red-600", // Vivid Orange/Red Gradient
        "checkOut"
      );
    } else {
      showStatusMessage(
        "ក្រៅម៉ោង Check-in",
        "សូមរង់ចាំដល់ម៉ោងកំណត់",
        "ph-clock-slash",
        "bg-slate-100 text-slate-400"
      );
    }
  }
}

// ============================================
// 9. USER SELECTION & INIT
// ============================================

async function selectUser(employee) {
  changeView("homeView");
  
  // Skeleton / Loading UI
  if(profileName) profileName.innerHTML = `<span class="animate-pulse bg-gray-200 rounded h-6 w-32 inline-block"></span>`;
  if(profileId) profileId.textContent = "...";
  if(profileImage) profileImage.src = PLACEHOLDER_IMG;
  
  const actionArea = $("dynamicActionArea");
  const activityArea = $("todayActivitySection");
  if(actionArea) actionArea.style.opacity = "0";
  if(activityArea) activityArea.style.opacity = "0";

  currentUser = employee;
  localStorage.setItem("savedEmployeeId", employee.id);
  
  const dayOfWeek = new Date().getDay();
  const dayToShiftKey = ["shiftSun", "shiftMon", "shiftTue", "shiftWed", "shiftThu", "shiftFri", "shiftSat"];
  currentUserShift = currentUser[dayToShiftKey[dayOfWeek]] || "N/A";

  const firestoreUserId = currentUser.id;
  attendanceCollectionRef = collection(dbAttendance, `attendance/${firestoreUserId}/records`);

  currentDeviceId = self.crypto.randomUUID();
  localStorage.setItem("currentDeviceId", currentDeviceId);

  try {
    await setDoc(doc(sessionCollectionRef, employee.id), {
      deviceId: currentDeviceId,
      timestamp: new Date().toISOString(),
      employeeName: employee.name,
    });

    if(profileName) profileName.textContent = employee.name;
    if(profileId) profileId.textContent = `ID: ${employee.id}`;
    
    // ✅ កែសម្រួល៖ ប្រើ onload event ដើម្បីធានាថារូបបាន Load ចប់ទើបអោយ AI ដំណើរការ
    if(profileImage) {
        // កំណត់ CORS អោយ AI អាចអានរូបបាន
        profileImage.crossOrigin = "Anonymous";
        
        const imgSrc = employee.photoUrl || PLACEHOLDER_IMG;
        profileImage.src = imgSrc;
        
        // Error Handling
        profileImage.onerror = () => {
            profileImage.onerror = null;
            profileImage.src = PLACEHOLDER_IMG;
        };

        // រង់ចាំរូប Load ចប់ ទើបហៅ prepareFaceMatcher
        // ដោយប្រើ profileImage (Element) ផ្ទាល់ មិនមែន URL ទេ
        profileImage.onload = () => {
             prepareFaceMatcher(profileImage);
        };
    }
    
    if(profileDepartment) profileDepartment.textContent = employee.department || "N/A";
    if(profileGroup) profileGroup.textContent = employee.group || "N/A";
    if(profileShift) profileShift.textContent = currentUserShift;

    setupAttendanceListener();
    startLeaveListeners();
    startSessionListener(employee.id); 
    // prepareFaceMatcher ត្រូវបានហៅក្នុង onload ខាងលើហើយ

    if(employeeListContainer) employeeListContainer.classList.add("hidden");
    if(searchInput) searchInput.value = "";

  } catch (error) {
    console.error("Error setting session:", error);
    showMessage("Error", "បញ្ហាបណ្តាញ (Internet Connection)");
    changeView("employeeListView");
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("savedEmployeeId");
  if (attendanceListener) attendanceListener();
  if (sessionListener) sessionListener();
  if (leaveCollectionListener) leaveCollectionListener();
  if (outCollectionListener) outCollectionListener();

  attendanceRecords = [];
  leaveRecords = [];
  currentMonthRecords = [];
  
  if(historyContainer) historyContainer.innerHTML = "";
  if(monthlyHistoryContainer) monthlyHistoryContainer.innerHTML = "";
  
  changeView("employeeListView");
}

function forceLogout(message) {
  logout();
  showMessage("Log Out", message, true);
}

function checkAutoLogin() {
    const savedId = localStorage.getItem("savedEmployeeId");
    if (savedId) {
        const savedEmp = allEmployees.find(e => e.id === savedId);
        if (savedEmp) selectUser(savedEmp);
        else changeView("employeeListView");
    } else {
        changeView("employeeListView");
    }
}

// ✅ មុខងារថ្មី៖ ទាញទិន្នន័យពី Realtime Database (Updated with Filters)
function fetchEmployeesFromRTDB() {
  changeView("loadingView");
  const studentsRef = ref(dbEmployeeList, 'students');
  onValue(studentsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
        allEmployees = [];
        renderEmployeeList([]);
        changeView("employeeListView");
        return;
    }

    allEmployees = Object.keys(data).map(key => {
        const student = data[key];
        const schedule = student["កាលវិភាគ"] || {};
        return {
            id: String(key).trim(),
            name: student["ឈ្មោះ"] || "N.A",
            // Use ផ្នែកការងារ for department filtering
            department: student["ផ្នែកការងារ"] || "N.A", 
            photoUrl: student["រូបថត"] || null,
            // Use ក្រុម for group filtering
            group: student["ក្រុម"] || "N.A", 
            gender: student["ភេទ"] || "N/A",
            grade: student["ថ្នាក់"] || "N/A",
            
            shiftMon: schedule["ចន្ទ"] || null,
            shiftTue: schedule["អង្គារ"] || schedule["អង្គារ៍"] || null,
            shiftWed: schedule["ពុធ"] || null,
            shiftThu: schedule["ព្រហស្បតិ៍"] || schedule["ព្រហស្បត្តិ៍"] || null,
            shiftFri: schedule["សុក្រ"] || null,
            shiftSat: schedule["សៅរ៍"] || null,
            shiftSun: schedule["អាទិត្យ"] || null,
        };
    }).filter(emp => {
       
        // Department: "training_ជំនាន់២"
        const group = (emp.group || "").trim();
        const dept = (emp.department || "").trim();
        
        const isGroupMatch = group === "IT Support" || group === "DRB";
        return isGroupMatch;
      
    });

    renderEmployeeList(allEmployees);
    checkAutoLogin(); 
    
    if (loadingView.style.display !== 'none') {
         // checkAutoLogin will handle view change if logged in
         // If not, we stay at employeeListView
         if (!localStorage.getItem("savedEmployeeId")) {
             changeView("employeeListView");
         }
    }
  }, (error) => {
      console.error(error);
      showMessage("Error", "បរាជ័យក្នុងការទាញយកទិន្នន័យពី Database");
      changeView("employeeListView");
  });
}

// ============================================
// 10. APP INITIALIZATION
// ============================================

function setupAuthListener() {
  onAuthStateChanged(authAttendance, (user) => {
    if (user) {
      loadAIModels();
    } else {
      signInAnonymously(authAttendance).catch((error) => {
        showMessage("បញ្ហា", `Login Error: ${error.message}`, true);
      });
    }
  });
}

async function initializeAppFirebase() {
  try {
    const attendanceApp = initializeApp(firebaseConfigAttendance);
    dbAttendance = getFirestore(attendanceApp);
    authAttendance = getAuth(attendanceApp); 
    dbShift = getDatabase(attendanceApp);
    sessionCollectionRef = collection(dbAttendance, "active_sessions");

    const leaveApp = initializeApp(firebaseConfigLeave, "leaveApp");
    dbLeave = getFirestore(leaveApp);

    // ✅ Initialize Employee List Database
    const employeeListApp = initializeApp(firebaseConfigEmployeeList, "employeeListApp");
    dbEmployeeList = getDatabase(employeeListApp);

    setLogLevel("silent");

    setupAuthListener();
    // ✅ ហៅមុខងារថ្មី (Call the new function)
    fetchEmployeesFromRTDB();

  } catch (error) {
    showMessage("Error", error.message, true);
  }
}

// Event Listeners
if(searchInput) {
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allEmployees.filter(e => e.name.toLowerCase().includes(term) || e.id.includes(term));
        renderEmployeeList(filtered);
    });
    searchInput.addEventListener("focus", () => {
        if(employeeListHeader) employeeListHeader.style.display = "none";
        if(employeeListContent) employeeListContent.style.paddingTop = "1rem";
        renderEmployeeList(allEmployees);
    });
    searchInput.addEventListener("blur", () => {
        setTimeout(() => {
            if(employeeListHeader) employeeListHeader.style.display = "flex";
            if(employeeListContent) employeeListContent.style.paddingTop = "";
            if(employeeListContainer) employeeListContainer.classList.add("hidden");
        }, 200);
    });
}

if(logoutButton) logoutButton.addEventListener("click", () => showConfirmation("Log Out", "ចាកចេញមែនទេ?", "Yes", () => { logout(); hideMessage(); }));
if(exitAppButton) exitAppButton.addEventListener("click", () => showConfirmation("Exit", "បិទកម្មវិធី?", "Yes", () => { window.close(); hideMessage(); }));
if(cameraCloseButton) cameraCloseButton.addEventListener("click", hideCameraModal);
if(navHomeButton) navHomeButton.addEventListener("click", () => { changeView("homeView"); navHomeButton.classList.add("active-nav"); navHistoryButton.classList.remove("active-nav"); });
if(navHistoryButton) navHistoryButton.addEventListener("click", () => { changeView("historyView"); navHistoryButton.classList.add("active-nav"); navHomeButton.classList.remove("active-nav"); });

document.addEventListener("DOMContentLoaded", initializeAppFirebase);
