// ============================================
// 1. IMPORTS & DEPENDENCIES
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
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
  get,
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
  ពេញម៉ោង: {
    startCheckIn: "07:00 AM",
    endCheckIn: "10:15 AM",
    startCheckOut: "04:30 PM",
    endCheckOut: "11:50 PM",
  },
  ពេលយប់: {
    startCheckIn: "05:00 PM",
    endCheckIn: "07:50 PM",
    startCheckOut: "08:55 PM",
    endCheckOut: "11:50 PM",
  },
  មួយព្រឹក: {
    startCheckIn: "07:00 AM",
    endCheckIn: "10:15 AM",
    startCheckOut: "11:30 AM",
    endCheckOut: "11:50 PM",
  },
  មួយរសៀល: {
    startCheckIn: "12:00 PM",
    endCheckIn: "02:30 PM",
    startCheckOut: "05:30 PM",
    endCheckOut: "11:50 PM",
  },
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
  measurementId: "G-NQ798D9J6K",
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
// Function ថ្មី៖ សម្រាប់បង្កើតអក្សរបង្ហាញម៉ោង (ថែមពាក្យ "មកយឺត" បើខុសលក្ខខណ្ឌ)
function getDisplayTimeWithStatus(timeStr, shift, dateStr) {
  if (!timeStr || timeStr === "--:--") return "--:--";

  const timeDecimal = parseTimeStringToDecimal(timeStr);
  if (timeDecimal === null) return timeStr;

  const dateObj = new Date(dateStr);
  const day = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  let isLate = false;

  // 1. វេន "ពេញម៉ោង" ឬ "មួយព្រឹក"
  if (shift === "ពេញម៉ោង" || shift === "មួយព្រឹក") {
    // ថ្ងៃ ច័ន្ទ(1), ពុធ(3), សៅរ៍(6) => យឺតចាប់ពី 7:50 AM (7.833)
    if (day === 1 || day === 3 || day === 6) {
       if (timeDecimal >= (7 + 50/60)) isLate = true;
    } 
    // ថ្ងៃផ្សេងទៀត (អង្គារ, ព្រហ, សុក្រ, អាទិត្យ) => យឺតចាប់ពី 7:30 AM (7.5)
    else {
       if (timeDecimal >= 7.5) isLate = true;
    }
  } 
  // 2. វេន "មួយរសៀល" => យឺតចាប់ពី 12:30 PM (12.5)
  else if (shift === "មួយរសៀល") {
    if (timeDecimal >= 12.5) isLate = true;
  }
  // 3. វេន "ពេលយប់" => យឺតចាប់ពី 5:30 PM (17.5)
  else if (shift === "ពេលយប់") {
    if (timeDecimal >= 17.5) isLate = true;
  }

  // បើមកយឺត បន្ថែមអក្សរ និងពណ៌ក្រហមបន្តិច
  if (isLate) {
    return `${timeStr} <span class="text-red-500 text-[10px]">(មកយឺត)</span>`;
  }
  
  return timeStr;
}
function changeView(viewId) {
  [loadingView, employeeListView, homeView, historyView].forEach((v) => {
    if (v) v.style.display = "none";
  });
  const view = $(viewId);
  if (view) view.style.display = "flex";
  if (viewId === "homeView" || viewId === "historyView") {
    if (footerNav) footerNav.style.display = "block";
  } else {
    if (footerNav) footerNav.style.display = "none";
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

  if (customModal) {
    customModal.innerHTML = modalContent;
    const btn = $("modalConfirmButtonAction");
    if (btn) btn.onclick = hideMessage;
    customModal.classList.remove("modal-hidden");
    customModal.classList.add("modal-visible");
  }
}

function showConfirmation(title, message, confirmText, onConfirm) {
  // ពិនិត្យមើលថា តើជាការចាកចេញ (Log Out/Exit) ឬអត់ ដើម្បីប្តូរពណ៌ប៊ូតុង
  const isDangerAction =
    title === "Log Out" || title === "Exit" || title === "ចាកចេញ";
  const confirmBtnClass = isDangerAction
    ? "modal-btn-danger"
    : "modal-btn-primary";

  // កំណត់ Icon តាមប្រភេទសកម្មភាព
  let iconHtml = "";
  if (isDangerAction) {
    iconHtml = `
      <div class="status-icon-wrapper bg-red-50 text-red-500">
        <i class="ph-duotone ph-sign-out"></i>
      </div>`;
  } else {
    iconHtml = `
      <div class="status-icon-wrapper bg-orange-50 text-orange-500">
        <i class="ph-fill ph-question"></i>
      </div>`;
  }

  const modalContent = `
    <div class="modal-box-design">
      ${iconHtml}
      <h3 class="modal-title-text">${title}</h3>
      <p class="modal-body-text">${message}</p>
      <div class="grid grid-cols-2 gap-3 mt-4">
        <button id="modalCancelBtn" class="modal-btn modal-btn-secondary">
          បោះបង់
        </button>
        <button id="modalOkBtn" class="modal-btn ${confirmBtnClass}">
          ${confirmText}
        </button>
      </div>
    </div>
  `;

  if (customModal) {
    customModal.innerHTML = modalContent;

    // Setup Event Listeners
    const cancelBtn = $("modalCancelBtn");
    const okBtn = $("modalOkBtn");

    if (cancelBtn) cancelBtn.onclick = hideMessage;
    if (okBtn)
      okBtn.onclick = () => {
        hideMessage(); // បិទ Modal សិន ចាំធ្វើការ
        setTimeout(onConfirm, 200); // ទុកពេលឱ្យ Animation បិទចប់បន្តិច
      };

    customModal.classList.remove("modal-hidden");
    customModal.classList.add("modal-visible");
  }
}

function hideMessage() {
  if (customModal) {
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
    const month = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return "";
  }
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

function parseTimeStringToDecimal(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const cleanStr = timeStr.replace(/[^a-zA-Z0-9:]/g, "");
  const match = cleanStr.match(/(\d+):(\d+)(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  else if (ampm === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
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
        switch (error.code) {
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
    const viy = polygon[i][0],
      vix = polygon[i][1];
    const vjy = polygon[j][0],
      vjx = polygon[j][1];
    if (
      viy > lat !== vjy > lat &&
      lon < ((vjx - vix) * (lat - viy)) / (vjy - viy) + vix
    ) {
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
  attendanceRecords.forEach((r) => mergedMap.set(r.date, { ...r }));
  return Array.from(mergedMap.values());
}

async function mergeAndRenderHistory() {
  currentMonthRecords = mergeAttendanceAndLeave(
    attendanceRecords,
    leaveRecords
  );

  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, "0");
  const currentYearStr = String(now.getFullYear());
  const monthPrefix = `${currentYearStr}-${currentMonthStr}`;

  currentMonthRecords = currentMonthRecords.filter((r) =>
    r.date.startsWith(monthPrefix)
  );

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
  
  // រកមើលទិន្នន័យថ្ងៃនេះ
  const todayRecord = currentMonthRecords.find(
    (record) => record.date === todayString
  );

  // ករណីទី ១: មិនទាន់មានទិន្នន័យ (បង្ហាញប្រអប់ទទេ)
  if (!todayRecord) {
    historyContainer.innerHTML = `
      <div class="bg-white/50 border border-dashed border-slate-300 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center animate-slide-up">
        <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
          <i class="ph-duotone ph-clock text-2xl"></i>
        </div>
        <p class="text-sm font-bold text-slate-600">មិនទាន់មានសកម្មភាព</p>
        <p class="text-xs text-slate-400 mt-1">ទិន្នន័យថ្ងៃនេះនឹងបង្ហាញនៅទីនេះ</p>
      </div>
    `;
    return;
  }

  // ករណីទី ២: មានទិន្នន័យ (បង្ហាញកាតស្អាត + គណនាម៉ោងយឺត)
  
  // ទាញយក Shift ពី Record (បើគ្មាន យកពី User បច្ចុប្បន្ន)
  const currentShift = todayRecord.shift || currentUserShift;

  // 🔥 ហៅ Helper Function ដើម្បីពិនិត្យមើលថា CheckIn យឺតឬអត់?
  const displayCheckIn = getDisplayTimeWithStatus(
      todayRecord.checkIn, 
      currentShift,
      todayRecord.date
  );

  const checkOut = todayRecord.checkOut || "--:--";
  
  // កំណត់ពណ៌
  const inColor = todayRecord.checkIn 
      ? "text-slate-800 bg-green-50 border-green-100" 
      : "text-slate-400 bg-slate-50 border-slate-100";
      
  const outColor = todayRecord.checkOut 
      ? "text-slate-800 bg-red-50 border-red-100" 
      : "text-slate-400 bg-slate-50 border-slate-100";

  const card = document.createElement("div");
  card.className = "bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 relative overflow-hidden animate-slide-up";
  
  card.innerHTML = `
      <div class="flex items-center justify-between mb-4 relative z-10">
         <div>
            <span class="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Today Status</span>
            <h3 class="text-sm font-bold text-slate-800 mt-0.5">${todayRecord.formattedDate}</h3>
         </div>
         <span class="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md shadow-blue-200">
            TODAY
         </span>
      </div>

      <div class="grid grid-cols-2 gap-3 relative z-10">
      
         <div class="flex flex-col p-3 rounded-2xl border ${inColor}">
            <div class="flex items-center gap-2 mb-2">
               <div class="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center">
                  <i class="ph-fill ph-sign-in text-xs"></i>
               </div>
               <span class="text-[10px] font-bold opacity-70">ម៉ោងចូល</span>
            </div>
            <span class="text-sm font-bold tracking-tight">${displayCheckIn}</span>
         </div>

         <div class="flex flex-col p-3 rounded-2xl border ${outColor}">
            <div class="flex items-center gap-2 mb-2">
               <div class="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center">
                  <i class="ph-fill ph-sign-out text-xs"></i>
               </div>
               <span class="text-[10px] font-bold opacity-70">ម៉ោងចេញ</span>
            </div>
            <span class="text-lg font-bold tracking-tight">${checkOut}</span>
         </div>
      </div>
      
      <div class="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full blur-2xl z-0"></div>
  `;
  
  historyContainer.appendChild(card);
}

// ============================================
// Function: renderMonthlyHistory (Full Update)
// ============================================
function renderMonthlyHistory() {
  if (!monthlyHistoryContainer) return;
  monthlyHistoryContainer.innerHTML = "";

  // ករណីគ្មានទិន្នន័យសម្រាប់ខែនេះ
  if (currentMonthRecords.length === 0) {
    monthlyHistoryContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12 opacity-50 animate-slide-up">
        <i class="ph-duotone ph-calendar-slash text-5xl mb-3 text-slate-300"></i>
        <p class="text-sm font-medium text-slate-400">គ្មានទិន្នន័យសម្រាប់ខែនេះ</p>
      </div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  
  currentMonthRecords.forEach((record, i) => {
    // 🔥 ហៅ Helper Function ដើម្បីគណនាម៉ោង និងបង្ហាញពាក្យ (មកយឺត)
    // យើងប្រើ record.shift ដើម្បីដឹងថាថ្ងៃនោះគាត់វេនអ្វី (បានពីការ Save ក្នុង Database)
    const displayCheckIn = getDisplayTimeWithStatus(
        record.checkIn, 
        record.shift, 
        record.date
    );

    const checkOut = record.checkOut ? record.checkOut : "--:--";
    
    // ពិនិត្យថាជាថ្ងៃនេះឬអត់?
    const isToday = record.date === getTodayDateString();
    
    // កំណត់ Style សម្រាប់កាត
    const borderClass = isToday ? "border-blue-200 ring-4 ring-blue-50" : "border-slate-100";
    const bgClass = "bg-white"; // ពណ៌ផ្ទៃកាត
    
    // កំណត់ពណ៌សម្រាប់ម៉ោង (បើអត់ទាន់មានម៉ោង ដាក់ពណ៌ប្រផេះ)
    const inStatusColor = record.checkIn ? "bg-green-500" : "bg-slate-300";
    const outStatusColor = record.checkOut ? "bg-red-500" : "bg-slate-300";
    const outTextStyle = record.checkOut ? "text-slate-800 font-bold" : "text-slate-300 font-medium";

    const card = document.createElement("div");
    // list-item-anim គឺជា Animation ឱ្យវាលោតមកម្ដងមួយៗ
    card.className = `${bgClass} rounded-2xl p-4 border ${borderClass} mb-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] list-item-anim relative`;
    card.style.animationDelay = `${i * 0.05}s`;

    card.innerHTML = `
       <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-100">
                ${new Date(record.date).getDate()}
             </div>
             <div class="flex flex-col">
                <span class="text-sm font-bold text-slate-700">${record.formattedDate}</span>
                ${isToday ? '<span class="text-[9px] text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded w-fit">Today</span>' : ''}
             </div>
          </div>
       </div>

       <div class="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
          
          <div class="flex-1 flex flex-col items-center justify-center py-2 border-r border-slate-200 border-dashed">
             <span class="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Check In</span>
             <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full ${inStatusColor}"></div>
                <span class="text-sm font-bold text-slate-800 flex items-center">
                    ${displayCheckIn}
                </span>
             </div>
          </div>

          <div class="flex-1 flex flex-col items-center justify-center py-2">
             <span class="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Check Out</span>
             <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full ${outStatusColor}"></div>
                <span class="text-sm ${outTextStyle}">${checkOut}</span>
             </div>
          </div>

       </div>
    `;
    fragment.appendChild(card);
  });
  
  monthlyHistoryContainer.appendChild(fragment);
}

function renderEmployeeList(employees) {
  if (!employeeListContainer) return;
  employeeListContainer.innerHTML = "";
  employeeListContainer.classList.remove("hidden");

  if (employees.length === 0) {
    employeeListContainer.innerHTML = `<p class="text-center text-gray-500 p-3">រកមិនឃើញ។</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  employees.forEach((emp) => {
    const card = document.createElement("div");
    card.className =
      "flex items-center p-3 rounded-xl cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm mb-2 bg-white border border-slate-50";

    // កែសម្រួល៖ បន្ថែម flex-shrink-0 លើរូបភាព និង min-w-0 លើអក្សរ
    card.innerHTML = `
      <img src="${emp.photoUrl || PLACEHOLDER_IMG}" 
           class="w-12 h-12 min-w-[3rem] min-h-[3rem] rounded-full object-cover border-2 border-slate-100 mr-3 bg-slate-200 flex-shrink-0"
           loading="lazy"
           onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
      <div class="flex flex-col overflow-hidden min-w-0">
           <h3 class="text-sm font-bold text-slate-800 truncate">${
             emp.name
           }</h3>
           <p class="text-xs text-slate-500 truncate">ID: ${emp.id}</p>
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
    currentMonthRecords = mergeAttendanceAndLeave(
      attendanceRecords,
      leaveRecords
    ); // Call mergeAndRenderHistory to apply filtering

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
  const reFetch = async () => {
    mergeAndRenderHistory();
  };

  try {
    const qLeave = query(
      collection(
        dbLeave,
        "artifacts/default-app-id/public/data/leave_requests"
      ),
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
    if (!docSnap.exists()) {
      forceLogout("Session បានបញ្ចប់។");
      return;
    }
    const sessionData = docSnap.data();
    if (
      localStorage.getItem("currentDeviceId") &&
      sessionData.deviceId !== localStorage.getItem("currentDeviceId")
    ) {
      forceLogout("គណនីកំពុងប្រើនៅកន្លែងផ្សេង។");
    }
  });
}

// ============================================
// 7. FACE & CAMERA LOGIC
// ============================================

// រកមើល function loadAIModels ហើយកែដូចខាងក្រោម
async function loadAIModels() {
  // បង្ហាញអក្សរប្រាប់អ្នកប្រើ
  if (typeof cameraLoadingText !== "undefined") {
    cameraLoadingText.textContent = "កំពុងរៀបចំ AI Brain (1/2)...";
  } else {
    const loadingTxt = document.getElementById("loadingText");
    if (loadingTxt) loadingTxt.textContent = "កំពុងរៀបចំ AI Brain (1/2)...";
  }

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
      faceapi.nets.faceExpressionNet.loadFromUri("./models"),
    ]);
    modelsLoaded = true;
    console.log("✅ AI Models Loaded Successfully");
  } catch (e) {
    console.error("Error loading models:", e);
    alert("មិនអាច Load AI Models បានទេ។ សូមពិនិត្យមើល Internet!");
  }
}

// ✅ កែសម្រួល៖ ប្រើរូបភាពពី DOM ផ្ទាល់ ជំនួសឱ្យការ Download ថ្មី
async function prepareFaceMatcher(imgElement) {
  currentUserFaceMatcher = null;
  profileFaceError = false;
  if (!imgElement) return;

  try {
    // ប្រើរូបភាពដែល Load រួចស្រាប់នៅក្នុង HTML
    const detection = await faceapi
      .detectSingleFace(imgElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

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

// រកមើល function selectUser ហើយជំនួសដោយកូដនេះ
// ============================================
// Function: finalizeLogin (Full Update)
// ============================================

async function startFaceScan(action) {
  currentScanAction = action;
  livenessStep = 0; // ✅ Reset Step

  if (!modelsLoaded) {
    showMessage("Notice", "AI មិនទាន់ដំណើរការ (Models not found).");
    return;
  }

  if (cameraModal) {
    cameraModal.classList.remove("modal-hidden");
    cameraModal.classList.add("modal-visible");
  }

  try {
    let stream;
    try {
      // ព្យាយាមបើកកាមេរ៉ាជាមួយការកំណត់ល្អ (Resolution ខ្ពស់)
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    } catch (e) {
      console.warn("High-res camera failed, trying basic...", e); // បើបរាជ័យ (ដូជានៅលើ Telegram ខ្លះ) ព្យាយាមបើកតាមរបៀបធម្មតា
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    }

    videoStream = stream;

    if (videoElement) {
      videoElement.srcObject = videoStream; // Telegram/Webview ត្រូវការ play() ច្បាស់លាស់
      videoElement.setAttribute("playsinline", "true");
      await videoElement.play().catch((e) => console.error("Play error:", e));

      isScanning = true;
      livenessStep = 0; // Reset step // រង់ចាំវីដេអូដើរស្រួលបួលសិន

      if (videoElement.readyState >= 3) {
        // HAVE_FUTURE_DATA
        scanLoop();
      } else {
        videoElement.oncanplay = () => scanLoop();
      }
    }
  } catch (err) {
    console.error("Camera Error:", err);
    let msg = "កាមេរ៉ាមានបញ្ហា";
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      msg = "សូមអនុញ្ញាត (Allow) ឱ្យប្រើកាមេរ៉ានៅក្នុង Settings។";
    }
    showMessage("Error", msg);
    hideCameraModal();
  }
}

function stopCamera() {
  isScanning = false;
  if (videoStream) videoStream.getTracks().forEach((t) => t.stop());
  if (videoElement) videoElement.srcObject = null;
}
function hideCameraModal() {
  stopCamera();
  if (cameraModal) {
    cameraModal.classList.add("modal-hidden");
    cameraModal.classList.remove("modal-visible");
  }
  // បើសិនជាបិទកាមេរ៉ា ក្នុងពេលកំពុង Login (ហើយមិនមែនមកពីការស្កេនជោគជ័យទេ) -> Logout
  if (currentScanAction === "login") {
    console.log("User cancelled login scan.");
    logout();
  }
}

async function scanLoop() {
  if (!isScanning) return;

  if (profileFaceError) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent = "រូប Profile មើលមិនច្បាស់ (រកមុខមិនឃើញ)";
      cameraLoadingText.className = "text-red-500 font-bold text-lg mb-1";
    }
    return;
  }

  if (
    videoElement.paused ||
    videoElement.ended ||
    !faceapi.nets.tinyFaceDetector.params
  ) {
    return setTimeout(scanLoop, 100);
  } // Adjust thresholds based on step: when turning head, recognition score drops, so we relax threshold

  const currentMatchThreshold = livenessStep > 0 ? 0.65 : FACE_MATCH_THRESHOLD;

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.5,
  }); // Include expressions if loaded
  let detection;
  try {
    if (faceapi.nets.faceExpressionNet.params) {
      detection = await faceapi
        .detectSingleFace(videoElement, options)
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withFaceExpressions();
    } else {
      detection = await faceapi
        .detectSingleFace(videoElement, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
    }
  } catch (e) {
    console.error("Detect error", e);
    return setTimeout(scanLoop, 100);
  }

  if (!detection) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent = "កំពុងស្វែងរកមុខ...";
      cameraLoadingText.className = "text-white font-bold text-lg mb-1";
    }
    return setTimeout(scanLoop, 30);
  }

  if (!currentUserFaceMatcher) {
    if (cameraLoadingText)
      cameraLoadingText.textContent = "កំពុងរៀបចំទិន្នន័យមុខ...";
    return setTimeout(scanLoop, 500);
  }

  const match = currentUserFaceMatcher.findBestMatch(detection.descriptor); // Check Identity (with dynamic threshold)

  if (match.distance > currentMatchThreshold) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent =
        "មុខមិនត្រូវគ្នា (" + Math.round((1 - match.distance) * 100) + "%)";
      cameraLoadingText.className = "text-red-500 font-bold text-lg mb-1";
    } // Only reset step if match is VERY poor (totally wrong person)
    if (match.distance > 0.7) {
      livenessStep = 0;
    }
    setTimeout(scanLoop, 100);
    return;
  } // If matched, proceed with Liveness Steps

  const landmarks = detection.landmarks; // Nose tip: index 30. Left cheek: 0. Right cheek: 16.
  const noseX = landmarks.positions[30].x;
  const leftFaceX = landmarks.positions[0].x;
  const rightFaceX = landmarks.positions[16].x; // Ratio 0.5 is center. // Looking Left (user's left) -> Nose moves right on image -> Ratio increases (>0.5) // Looking Right (user's right) -> Nose moves left on image -> Ratio decreases (<0.5)

  const faceTurnRatio = (noseX - leftFaceX) / (rightFaceX - leftFaceX);

  if (livenessStep === 0) {
    // Matched! Move to Smile
    livenessStep = 1;
  }

  if (livenessStep === 1) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent = "សូមញញឹមបន្តិច (Smile)";
      cameraLoadingText.className =
        "text-yellow-400 font-bold text-lg mb-1 animate-pulse";
    }

    let isSmiling = false;
    if (
      detection.expressions &&
      detection.expressions.happy > SMILE_THRESHOLD
    ) {
      isSmiling = true;
    }

    if (isSmiling) {
      livenessStep = 2; // Move to Turn Left
    }
  } else if (livenessStep === 2) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent = "សូមងាកឆ្វេង (Turn Left)";
      cameraLoadingText.className =
        "text-blue-400 font-bold text-lg mb-1 animate-pulse";
    } // Check Turn Left (Ratio increases > 0.6)

    if (faceTurnRatio > HEAD_TURN_LEFT_THRESHOLD) {
      livenessStep = 3; // Move to Turn Right
    }
  } else if (livenessStep === 3) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent = "សូមងាកស្តាំ (Turn Right)";
      cameraLoadingText.className =
        "text-blue-400 font-bold text-lg mb-1 animate-pulse";
    } // Check Turn Right (Ratio decreases < 0.4)

    if (faceTurnRatio < HEAD_TURN_RIGHT_THRESHOLD) {
      livenessStep = 4; // Done
    }
  } else if (livenessStep === 4) {
    if (cameraLoadingText) {
      cameraLoadingText.textContent = "ជោគជ័យ!";
      cameraLoadingText.className =
        "text-green-400 font-bold text-lg mb-1 animate-pulse";
    }
    isScanning = false;
    processScanSuccess();
    return;
  }

  setTimeout(scanLoop, 30);
}

// ✅ 2. កែសម្រួល៖ ពេលស្កេនជោគជ័យ បែងចែក Login និង CheckIn
// ✅ កែសម្រួល៖ ដោះស្រាយបញ្ហា Login Error (ការពារកុំឱ្យ Logout ពេលស្កេនជាប់)
function processScanSuccess() {
  if (cameraLoadingText)
    cameraLoadingText.innerHTML = '<span class="text-green-400">ជោគជ័យ!</span>';

  setTimeout(() => {
    // ចងចាំសកម្មភាពបច្ចុប្បន្ន
    const actionToPerform = currentScanAction;

    // សម្គាល់ថាបានបញ្ចប់ (កុំឱ្យ hideCameraModal ច្រឡំថាបិទចោល)
    currentScanAction = null;

    hideCameraModal();

    if (actionToPerform === "login") {
      // ស្កេន Login ជោគជ័យ -> ចូល Home
      if (currentUser) {
        finalizeLogin(currentUser);
      } else {
        changeView("employeeListView");
      }
    } else if (actionToPerform === "checkIn") {
      handleCheckIn();
    } else if (actionToPerform === "checkOut") {
      handleCheckOut();
    }
  }, 800);
}
// ============================================
// 8. CHECK-IN / CHECK-OUT LOGIC
// ============================================

async function handleCheckIn() {
  if (actionBtnTitle) actionBtnTitle.textContent = "កំពុងស្វែងរកទីតាំង...";

  try {
    // ✅ ១. ស្នើសុំទីតាំងពីទូរស័ព្ទ
    const coords = await getUserLocation();

    // ✅ ២. ផ្ទៀងផ្ទាត់ថា តើនៅក្នុងបរិវេណក្រុមហ៊ុនដែរឬទេ?
    if (!isInsideArea(coords.latitude, coords.longitude)) {
      showMessage("ទីតាំងមិនត្រឹមត្រូវ", "សូមលោកអ្នកស្ថិតនៅក្នុងបរិវេណក្រុមហ៊ុន ដើម្បី Check In។", true);
      updateButtonState(); // Reset ប៊ូតុងវិញ
      return; // បញ្ឈប់ដំណើរការ មិនឱ្យ Save ទៅ Firebase ទេ
    }

    // បើទីតាំងត្រូវហើយ បន្តដំណើរការ Save
    if (actionBtnTitle) actionBtnTitle.textContent = "កំពុងរក្សាទុក...";
    
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
      // ✅ រក្សាទុកទីតាំងជាក់ស្តែង
      checkInLocation: { lat: coords.latitude, lon: coords.longitude },
    });
    
    // បន្ទាប់ពី Save រួច Refresh ប៊ូតុង
    updateButtonState();

  } catch (e) {
    console.error(e);
    let msg = e.message;
    if (e.message.includes("Location")) msg = "មិនអាចយកទីតាំងបានទេ។ សូមបើក GPS ។";
    showMessage("Error", msg, true);
    updateButtonState();
  }
}

async function handleCheckOut() {
  if (actionBtnTitle) actionBtnTitle.textContent = "កំពុងស្វែងរកទីតាំង...";

  try {
    // ✅ ១. ស្នើសុំទីតាំងពីទូរស័ព្ទ
    const coords = await getUserLocation();

    // ✅ ២. ផ្ទៀងផ្ទាត់ថា តើនៅក្នុងបរិវេណក្រុមហ៊ុនដែរឬទេ?
    if (!isInsideArea(coords.latitude, coords.longitude)) {
      showMessage("ទីតាំងមិនត្រឹមត្រូវ", "សូមលោកអ្នកស្ថិតនៅក្នុងបរិវេណក្រុមហ៊ុន ដើម្បី Check Out។", true);
      updateButtonState();
      return;
    }

    // បើទីតាំងត្រូវហើយ បន្តដំណើរការ Save
    if (actionBtnTitle) actionBtnTitle.textContent = "កំពុងរក្សាទុក...";

    const now = new Date();
    const todayDocId = getTodayDateString(now);

    await setDoc(
      doc(attendanceCollectionRef, todayDocId),
      {
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        department: currentUser.department,
        shift: currentUserShift,
        date: todayDocId,
        formattedDate: formatDate(now),
        checkOutTimestamp: now.toISOString(),
        checkOut: formatTime(now),
        // ✅ រក្សាទុកទីតាំងជាក់ស្តែង
        checkOutLocation: { lat: coords.latitude, lon: coords.longitude },
      },
      { merge: true }
    );
    
    // បន្ទាប់ពី Save រួច Refresh ប៊ូតុង
    updateButtonState();

  } catch (e) {
    console.error(e);
    let msg = e.message;
    if (e.message.includes("Location")) msg = "មិនអាចយកទីតាំងបានទេ។ សូមបើក GPS ។";
    showMessage("Error", msg, true);
    updateButtonState();
  }
}

// ✅ 3. កែសម្រួល៖ ប៊ូតុង Check In/Out មិនហៅ startFaceScan ទេ (ហៅ handle ផ្ទាល់)
function showActionButton(title, subtitle, icon, gradientClass, action) {
  if (!actionButtonContainer) return;
  actionButtonContainer.classList.remove("hidden");

  actionBtnTitle.textContent = title;
  actionBtnTitle.className = "text-xl font-bold text-white tracking-wide";

  actionBtnSubtitle.textContent = subtitle;
  actionBtnSubtitle.className =
    "text-blue-100 text-[11px] font-medium opacity-90";

  actionBtnIcon.className = `ph-bold ${icon} text-2xl text-white`;

  actionBtnBg.className = `absolute inset-0 bg-gradient-to-r ${gradientClass} shadow-lg transition-all duration-500`;

  const currentBtn = $("mainActionButton");
  if (currentBtn) {
    // 🔥 កែត្រង់នេះ៖ ហៅ handleCheckIn ឬ handleCheckOut ផ្ទាល់តែម្តង
    currentBtn.onclick = () => {
      if (action === "checkIn") {
        handleCheckIn();
      } else {
        handleCheckOut();
      }
    };

    if (action === "checkIn") {
      currentBtn.className =
        "w-full group relative overflow-hidden rounded-[1.8rem] p-1 shadow-lg shadow-blue-300/50 transition-all active:scale-95 hover:shadow-xl btn-pulse";
    } else {
      currentBtn.className =
        "w-full group relative overflow-hidden rounded-[1.8rem] p-1 shadow-lg shadow-red-300/50 transition-all active:scale-95 hover:shadow-xl btn-pulse";
    }
  }
}

function showStatusMessage(title, desc, icon, iconBgClass) {
  if (!statusMessageContainer) return;
  statusMessageContainer.classList.remove("hidden");
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
  const canCheckOut = checkShiftTime(shift, "checkOut"); // 1. Check if already checked out

  if (todayData && todayData.checkOut) {
    showStatusMessage(
      "កត់ត្រារួចរាល់",
      "អ្នកបាន Check Out រួចរាល់ហើយ",
      "ph-check-circle",
      "bg-green-100 text-green-600"
    );
    return;
  } // 2. Logic for Check In/Out

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
      if (statusIcon) statusIcon.classList.add("animate-breathe");
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
// ✅ 1. កែសម្រួល៖ ពេលជ្រើសរើសឈ្មោះ ត្រូវស្កេនមុខសិន (Login Face Scan)

// ✅ Function ថ្មី៖ ដំណើរការចូលប្រើប្រាស់ ក្រោយពេលស្កេនមុខជោគជ័យ
// ✅ Function ថ្មី៖ ដំណើរការចូលប្រើប្រាស់ (កែសម្រួលដើម្បីការពារ Error)
// រក function នេះក្នុង script.js ហើយកែដូចខាងក្រោម
// ============================================
// Function: finalizeLogin (Full Update)
// ============================================
async function finalizeLogin(employee) {
  // 1. ការពារ Error: បើគ្មានទិន្នន័យបុគ្គលិក បញ្ឈប់ដំណើរការ
  if (!employee) {
    console.error("⛔ Error: finalizeLogin ត្រូវបានហៅដោយគ្មានទិន្នន័យ (null)!");
    changeView("employeeListView");
    return;
  }

  console.log("✅ Login ជោគជ័យសម្រាប់:", employee.name);
  currentUser = employee;

  // 2. រក្សាទុកទិន្នន័យសម្រាប់ Auto Login (៤ ថ្ងៃ)
  localStorage.setItem("savedEmployeeId", employee.id);
  // 🔥 កត់ត្រាម៉ោងបច្ចុប្បន្ន ដើម្បីពិនិត្យនៅពេលក្រោយ (4 Days Expiry)
  localStorage.setItem("loginTimestamp", Date.now().toString());

  // 3. ប្ដូរទៅកាន់ផ្ទាំង HomeView
  changeView("homeView");

  // 4. Update UI: បង្ហាញព័ត៌មានបុគ្គលិក
  if (profileName) profileName.textContent = employee.name;
  if (profileId) profileId.textContent = `ID: ${employee.id}`;
  if (profileImage) {
    // បើគ្មានរូប ប្រើរូប Placeholder
    profileImage.src = employee.photoUrl || PLACEHOLDER_IMG;
  }
  
  if (profileDepartment) profileDepartment.textContent = employee.department || "N/A";
  if (profileGroup) profileGroup.textContent = employee.group || "N/A";

  // 5. Reset UI: លាក់ប៊ូតុង និងសកម្មភាពចាស់ៗសិន (ដើម្បីឱ្យ Animation លោតមកស្អាត)
  const actionArea = document.getElementById("dynamicActionArea");
  const activityArea = document.getElementById("todayActivitySection");
  if (actionArea) actionArea.style.opacity = "0";
  if (activityArea) activityArea.style.opacity = "0";

  // 6. គណនា Shift (វេនការងារ) ប្រចាំថ្ងៃ
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const dayToShiftKey = [
    "shiftSun",
    "shiftMon",
    "shiftTue",
    "shiftWed",
    "shiftThu",
    "shiftFri",
    "shiftSat",
  ];

  // ទាញយក Shift ពីទិន្នន័យបុគ្គលិក (ការពារ Error ដោយប្រើ || "N/A")
  currentUserShift = employee[dayToShiftKey[dayOfWeek]] || "N/A";
  if (profileShift) profileShift.textContent = currentUserShift;

  // 7. កំណត់ Firebase References
  const firestoreUserId = employee.id;
  
  // ធានាថា Database ត្រូវបាន Initialize រួចរាល់
  if (typeof dbAttendance !== 'undefined' && dbAttendance) {
      attendanceCollectionRef = collection(
        dbAttendance,
        `attendance/${firestoreUserId}/records`
      );
  } else {
      console.error("Database not initialized!");
      return;
  }

  // 8. កត់ត្រា Session (Device ID)
  // បង្កើត ID ថ្មីសម្រាប់ Device នេះ (បើមិនទាន់មាន)
  currentDeviceId = localStorage.getItem("currentDeviceId");
  if (!currentDeviceId) {
      currentDeviceId = self.crypto.randomUUID();
      localStorage.setItem("currentDeviceId", currentDeviceId);
  }

  try {
    if (typeof sessionCollectionRef !== 'undefined' && sessionCollectionRef) {
      // Save ចូល Firestore ថាបុគ្គលិកនេះកំពុងប្រើ Device នេះ
      await setDoc(doc(sessionCollectionRef, employee.id), {
        deviceId: currentDeviceId,
        timestamp: new Date().toISOString(),
        employeeName: employee.name,
        lastLogin: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn("Session write failed (Network/Permission issue):", e);
  }

  // 9. ចាប់ផ្តើមស្តាប់ទិន្នន័យ (Realtime Listeners)
  setupAttendanceListener();      // ស្តាប់វត្តមាន (CheckIn/Out)
  startLeaveListeners();          // ស្តាប់ច្បាប់ (Leave)
  startSessionListener(employee.id); // ស្តាប់ការ Login ស្ទួន

  // 10. សម្អាតប្រអប់ស្វែងរក (Search Box)
  if (employeeListContainer) employeeListContainer.classList.add("hidden");
  if (searchInput) searchInput.value = "";
}
function logout() {
  currentUser = null;
  
  // ✅ Update: លុបទាំង ID និង Timestamp
  localStorage.removeItem("savedEmployeeId");
  localStorage.removeItem("loginTimestamp"); // <--- បន្ថែមបន្ទាត់នេះ

  if (attendanceListener) attendanceListener();
  if (sessionListener) sessionListener();
  if (leaveCollectionListener) leaveCollectionListener();
  if (outCollectionListener) outCollectionListener();

  attendanceRecords = [];
  leaveRecords = [];
  currentMonthRecords = [];

  if (historyContainer) historyContainer.innerHTML = "";
  if (monthlyHistoryContainer) monthlyHistoryContainer.innerHTML = "";

  changeView("employeeListView");
}

function forceLogout(message) {
  logout();
  showMessage("Log Out", message, true);
}

function checkAutoLogin() {
  const savedId = localStorage.getItem("savedEmployeeId");
  const loginTimestamp = localStorage.getItem("loginTimestamp");

  // កំណត់រយៈពេល ៤ ថ្ងៃ (គិតជា Milliseconds)
  // 4 ថ្ងៃ * 24 ម៉ោង * 60 នាទី * 60 វិនាទី * 1000
  const EXPIRATION_TIME = 6 * 24 * 60 * 60 * 1000; 

  if (savedId && loginTimestamp) {
    const now = Date.now();
    const timeDiff = now - parseInt(loginTimestamp, 10);

    // ប្រសិនបើពេលវេលាលើសពី ៤ ថ្ងៃ
    if (timeDiff > EXPIRATION_TIME) {
      console.log("⚠️ Session expired (More than 4 days). Require re-login.");
      
      // លុបការចងចាំចោល
      localStorage.removeItem("savedEmployeeId");
      localStorage.removeItem("loginTimestamp");
      
      // នៅផ្ទាំងបញ្ជីឈ្មោះ ដើម្បីឱ្យស្កេនមុខថ្មី
      changeView("employeeListView");
      return;
    }

    // បើមិនទាន់ហួស ៤ ថ្ងៃទេ ធ្វើការ Login ធម្មតា
    if (allEmployees.length > 0) {
      const savedEmp = allEmployees.find((e) => e.id === savedId);

      if (savedEmp) {
        console.log("🔄 Auto-login active (Within 4 days):", savedEmp.name);
        finalizeLogin(savedEmp);
      } else {
        changeView("employeeListView");
      }
    }
  } else {
    // បើគ្មានទិន្នន័យ ឬខ្វះ Timestamp -> ឱ្យ Login ថ្មី
    localStorage.removeItem("savedEmployeeId"); // សម្អាតចោលការពារ Error
    localStorage.removeItem("loginTimestamp");
    changeView("employeeListView");
  }
}

// ✅ មុខងារថ្មី៖ ទាញទិន្នន័យពី Realtime Database (Updated with Filters)
function fetchEmployeesFromRTDB() {
  changeView("loadingView");
  const studentsRef = ref(dbEmployeeList, "students");
  onValue(
    studentsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        allEmployees = [];
        renderEmployeeList([]);
        changeView("employeeListView");
        return;
      }

      allEmployees = Object.keys(data)
        .map((key) => {
          const student = data[key];
          const schedule = student["កាលវិភាគ"] || {};
          return {
            id: String(key).trim(),
            name: student["ឈ្មោះ"] || "N.A", // Use ផ្នែកការងារ for department filtering
            department: student["ផ្នែកការងារ"] || "N.A",
            photoUrl: student["រូបថត"] || null, // Use ក្រុម for group filtering
            group: student["ក្រុម"] || "N.A",
            gender: student["ភេទ"] || "N/A",
            grade: student["ថ្នាក់"] || "N/A",

            shiftMon: schedule["ចន្ទ"] || null,
            shiftTue: schedule["អង្គារ"] || schedule["អង្គារ៍"] || null,
            shiftWed: schedule["ពុធ"] || null,
            shiftThu:
              schedule["ព្រហស្បតិ៍"] || schedule["ព្រហស្បត្តិ៍"] || null,
            shiftFri: schedule["សុក្រ"] || null,
            shiftSat: schedule["សៅរ៍"] || null,
            shiftSun: schedule["អាទិត្យ"] || null,
          };
        })
        .filter((emp) => {
          // Department: "training_ជំនាន់២"
          const group = (emp.group || "").trim();
          const dept = (emp.department || "").trim();

          const isGroupMatch = group === "IT Support" || group === "DRB";
          return isGroupMatch;
        });

      renderEmployeeList(allEmployees);
      checkAutoLogin();

      if (loadingView.style.display !== "none") {
        // checkAutoLogin will handle view change if logged in
        // If not, we stay at employeeListView
        if (!localStorage.getItem("savedEmployeeId")) {
          changeView("employeeListView");
        }
      }
    },
    (error) => {
      console.error(error);
      showMessage("Error", "បរាជ័យក្នុងការទាញយកទិន្នន័យពី Database");
      changeView("employeeListView");
    }
  );
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

// រកមើល function initializeAppFirebase ហើយជំនួសដោយកូដនេះ
async function initializeAppFirebase() {
  try {
    // ១. បង្ហាញផ្ទាំង Loading ជាមុនសិន
    changeView("loadingView");

    // Initialize Firebase
    const attendanceApp = initializeApp(firebaseConfigAttendance);
    dbAttendance = getFirestore(attendanceApp);
    authAttendance = getAuth(attendanceApp);
    dbShift = getDatabase(attendanceApp);
    sessionCollectionRef = collection(dbAttendance, "active_sessions");

    const leaveApp = initializeApp(firebaseConfigLeave, "leaveApp");
    dbLeave = getFirestore(leaveApp);

    const employeeListApp = initializeApp(
      firebaseConfigEmployeeList,
      "employeeListApp"
    );
    dbEmployeeList = getDatabase(employeeListApp);

    setLogLevel("silent");

    // ២. 🔥 រង់ចាំឱ្យ AI Load ចប់សិន (Wait for AI) 🔥
    await loadAIModels();

    // ៣. បន្ទាប់ពី AI ចប់ ទើបចាប់ផ្តើមទាញទិន្នន័យ និង Auth
    if (document.getElementById("loadingText")) {
       document.getElementById("loadingText").textContent = "កំពុងទាញយកបញ្ជីឈ្មោះ (2/2)...";
    }
    
    setupAuthListener();
    fetchEmployeesFromRTDB(); // Function នេះនឹងបិទ LoadingView ពេលទិន្នន័យមកដល់

  } catch (error) {
    console.error(error);
    alert("Error Initializing App: " + error.message);
  }
}

// Event Listeners
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allEmployees.filter(
      (e) => e.name.toLowerCase().includes(term) || e.id.includes(term)
    );
    renderEmployeeList(filtered);
  });
  searchInput.addEventListener("focus", () => {
    if (employeeListHeader) employeeListHeader.style.display = "none";
    if (employeeListContent) employeeListContent.style.paddingTop = "1rem";
    renderEmployeeList(allEmployees);
  });
  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      if (employeeListHeader) employeeListHeader.style.display = "flex";
      if (employeeListContent) employeeListContent.style.paddingTop = "";
      if (employeeListContainer) employeeListContainer.classList.add("hidden");
    }, 200);
  });
}

if (logoutButton)
  logoutButton.addEventListener("click", () =>
    showConfirmation("Log Out", "ចាកចេញមែនទេ?", "Yes", () => {
      logout();
      hideMessage();
    })
  );
if (exitAppButton)
  exitAppButton.addEventListener("click", () =>
    showConfirmation("Exit", "បិទកម្មវិធី?", "Yes", () => {
      window.close();
      hideMessage();
    })
  );
if (cameraCloseButton)
  cameraCloseButton.addEventListener("click", hideCameraModal);
if (navHomeButton)
  navHomeButton.addEventListener("click", () => {
    changeView("homeView");
    navHomeButton.classList.add("active-nav");
    navHistoryButton.classList.remove("active-nav");
  });
if (navHistoryButton)
  navHistoryButton.addEventListener("click", () => {
    changeView("historyView");
    navHistoryButton.classList.add("active-nav");
    navHomeButton.classList.remove("active-nav");
  });

document.addEventListener("DOMContentLoaded", initializeAppFirebase);
