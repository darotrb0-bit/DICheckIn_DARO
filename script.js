// ==========================================
// 1. IMPORTS & CONFIGURATION
// ==========================================
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
  updateDoc,
  collection,
  onSnapshot,
  setLogLevel,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global Variables ---
let dbAttendance, dbLeave, authAttendance;
let allEmployees = [];
let currentMonthRecords = []; // Merged data
let attendanceRecords = [];
let leaveRecords = [];
let currentUser = null;
let currentUserShift = null;
let attendanceCollectionRef = null;
let attendanceListener = null;
let leaveCollectionListener = null;
let outCollectionListener = null;
let currentConfirmCallback = null;

// --- Session & Device Lock ---
let sessionCollectionRef = null;
let sessionListener = null;
let currentDeviceId = null;

// --- AI & Camera ---
let modelsLoaded = false;
let currentUserFaceMatcher = null;
let currentScanAction = null; // 'checkIn' or 'checkOut'
let videoStream = null;
const FACE_MATCH_THRESHOLD = 0.5;

// --- Maps & Configs ---
const durationMap = {
  "មួយថ្ងៃ": 1, "មួយព្រឹក": 0.5, "មួយរសៀល": 0.5,
  "មួយថ្ងៃកន្លះ": 1.5, "ពីរថ្ងៃ": 2, "ពីរថ្ងៃកន្លះ": 2.5, 
  "បីថ្ងៃ": 3, "បីថ្ងៃកន្លះ": 3.5, "បួនថ្ងៃ": 4, "បួនថ្ងៃកន្លះ": 4.5, 
  "ប្រាំថ្ងៃ": 5, "ប្រាំថ្ងៃកន្លះ": 5.5, "ប្រាំមួយថ្ងៃ": 6, 
  "ប្រាំមួយថ្ងៃកន្លះ": 6.5, "ប្រាំពីរថ្ងៃ": 7,
};

const SHEET_ID = "1eRyPoifzyvB4oBmruNyXcoKMKPRqjk6xDD6-bPNW6pc";
const SHEET_NAME = "DIList";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}&range=E9:AJ`;
const COL_INDEX = {
  ID: 0, GROUP: 2, NAME: 7, GENDER: 9, GRADE: 13, DEPT: 14,
  SHIFT_MON: 24, SHIFT_TUE: 25, SHIFT_WED: 26, SHIFT_THU: 27,
  SHIFT_FRI: 28, SHIFT_SAT: 29, SHIFT_SUN: 30, PHOTO: 31,
};

const firebaseConfigAttendance = {
  apiKey: "AIzaSyCgc3fq9mDHMCjTRRHD3BPBL31JkKZgXFc",
  authDomain: "checkme-10e18.firebaseapp.com",
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

// --- DOM Elements ---
const loadingView = document.getElementById("loadingView");
const loadingText = document.getElementById("loadingText");
const employeeListView = document.getElementById("employeeListView");
const homeView = document.getElementById("homeView");
const historyView = document.getElementById("historyView");
const footerNav = document.getElementById("footerNav");

const navHomeButton = document.getElementById("navHomeButton");
const navHistoryButton = document.getElementById("navHistoryButton");
const searchInput = document.getElementById("searchInput");
const employeeListContainer = document.getElementById("employeeListContainer");

const welcomeMessage = document.getElementById("welcomeMessage");
const logoutButton = document.getElementById("logoutButton");
const exitAppButton = document.getElementById("exitAppButton");

const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");
const profileId = document.getElementById("profileId");
const profileDepartment = document.getElementById("profileDepartment");
const profileGroup = document.getElementById("profileGroup");
const profileGrade = document.getElementById("profileGrade");
const profileShift = document.getElementById("profileShift");

const checkInButton = document.getElementById("checkInButton");
const checkOutButton = document.getElementById("checkOutButton");
const attendanceStatus = document.getElementById("attendanceStatus");

const historyContainer = document.getElementById("historyContainer");
const noHistoryRow = document.getElementById("noHistoryRow");
const monthlyHistoryContainer = document.getElementById("monthlyHistoryContainer");
const noMonthlyHistoryRow = document.getElementById("noMonthlyHistoryRow");

const customModal = document.getElementById("customModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCancelButton = document.getElementById("modalCancelButton");
const modalConfirmButton = document.getElementById("modalConfirmButton");

const cameraModal = document.getElementById("cameraModal");
const videoElement = document.getElementById("videoElement");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCloseButton = document.getElementById("cameraCloseButton");
const cameraLoadingText = document.getElementById("cameraLoadingText");
const cameraHelpText = document.getElementById("cameraHelpText");
const captureButton = document.getElementById("captureButton");

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

function changeView(viewId) {
  loadingView.style.display = "none";
  employeeListView.style.display = "none";
  homeView.style.display = "none";
  historyView.style.display = "none";
  footerNav.style.display = "none";

  if (viewId === "loadingView") loadingView.style.display = "flex";
  else if (viewId === "employeeListView") employeeListView.style.display = "flex";
  else if (viewId === "homeView") {
    homeView.style.display = "flex";
    footerNav.style.display = "block";
  } else if (viewId === "historyView") {
    historyView.style.display = "flex";
    footerNav.style.display = "block";
  }
}

function showMessage(title, message, isError = false) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalTitle.classList.toggle("text-red-600", isError);
  modalTitle.classList.toggle("text-gray-800", !isError);
  modalConfirmButton.textContent = "យល់ព្រម";
  modalCancelButton.style.display = "none";
  currentConfirmCallback = null;
  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

function showConfirmation(title, message, confirmText, onConfirm) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalTitle.classList.remove("text-red-600");
  modalTitle.classList.add("text-gray-800");
  modalConfirmButton.textContent = confirmText;
  modalCancelButton.style.display = "block";
  currentConfirmCallback = onConfirm;
  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

function hideMessage() {
  customModal.classList.add("modal-hidden");
  customModal.classList.remove("modal-visible");
  currentConfirmCallback = null;
}

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const monthString = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    startOfMonth: `${year}-${monthString}-01`,
    endOfMonth: `${year}-${monthString}-${String(lastDay).padStart(2, "0")}`
  };
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDate(date) {
  if (!date) return "";
  try {
    const day = String(date.getDate()).padStart(2, "0");
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) { return "Invalid Date"; }
}

function formatTime(date) {
  if (!date) return null;
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");
  return `${strHours}:${minutes} ${ampm}`;
}

const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseLeaveDate(dateString) {
  if (!dateString) return null;
  try {
    const parts = dateString.split("-");
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = monthMap[parts[1]];
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || month === undefined || isNaN(year)) return null;
    return new Date(year, month, day);
  } catch (e) { return null; }
}

function checkShiftTime(shiftType, checkType) {
  if (!shiftType || shiftType === "N/A") return false;
  if (shiftType === "Uptime") return true;
  const now = new Date();
  const currentTime = now.getHours() + now.getMinutes() / 60;
  const shiftRules = {
    ពេញម៉ោង: { checkIn: [6.83, 10.25], checkOut: [17.5, 22.25] },
    ពេលយប់: { checkIn: [17.66, 19.25], checkOut: [20.91, 22.83] },
    មួយព្រឹក: { checkIn: [6.83, 10.25], checkOut: [11.5, 13.25] },
    មួយរសៀល: { checkIn: [11.83, 14.5], checkOut: [17.5, 22.25] },
  };
  const rules = shiftRules[shiftType];
  if (!rules) return false;
  const [min, max] = rules[checkType];
  return currentTime >= min && currentTime <= max;
}

// ==========================================
// 3. CORE LOGIC (Attendance & Leave)
// ==========================================

async function fetchAllLeaveForMonth(employeeId) {
  if (!dbLeave) return [];
  
  const { startOfMonth, endOfMonth } = getCurrentMonthRange();
  const startMonthDate = new Date(startOfMonth + "T00:00:00");
  const endMonthDate = new Date(endOfMonth + "T23:59:59");
  let allLeaveRecords = [];

  // 1. Fetch from 'leave_requests'
  try {
    const qLeave = query(
      collection(dbLeave, "/artifacts/default-app-id/public/data/leave_requests"),
      where("userId", "==", employeeId),
      where("status", "==", "approved")
    );
    const leaveSnapshot = await getDocs(qLeave);

    leaveSnapshot.forEach((doc) => {
      const data = doc.data();
      const startDate = parseLeaveDate(data.startDate);
      if (!startDate) return;

      const durationStr = data.duration;
      const durationNum = durationMap[durationStr] || parseFloat(durationStr);
      const isMultiDay = !isNaN(durationNum) && durationNum > 0;

      if (isMultiDay) {
        const daysToSpan = Math.ceil(durationNum);
        for (let i = 0; i < daysToSpan; i++) {
          const currentLeaveDate = new Date(startDate);
          currentLeaveDate.setDate(startDate.getDate() + i);

          if (currentLeaveDate >= startMonthDate && currentLeaveDate <= endMonthDate) {
            let leaveLabel = `ច្បាប់ ${durationStr}`;
            // ករណីកន្លះថ្ងៃនៅថ្ងៃចុងក្រោយ
            const isHalfDay = (durationNum % 1 !== 0); 
            if (isHalfDay && i === daysToSpan - 1) {
               allLeaveRecords.push({
                 date: getTodayDateString(currentLeaveDate),
                 formattedDate: formatDate(currentLeaveDate),
                 checkIn: `${leaveLabel} (ព្រឹក)`,
                 checkOut: null 
               });
            } else {
               allLeaveRecords.push({
                 date: getTodayDateString(currentLeaveDate),
                 formattedDate: formatDate(currentLeaveDate),
                 checkIn: leaveLabel,
                 checkOut: leaveLabel
               });
            }
          }
        }
      } else {
        // Single Day cases (Morning/Afternoon)
        if (startDate >= startMonthDate && startDate <= endMonthDate) {
           const dateStr = getTodayDateString(startDate);
           const formatted = formatDate(startDate);
           if (durationStr === "មួយព្រឹក") {
             allLeaveRecords.push({ date: dateStr, formattedDate: formatted, checkIn: `ច្បាប់ ${durationStr}`, checkOut: null });
           } else if (durationStr === "មួយរសៀល") {
             allLeaveRecords.push({ date: dateStr, formattedDate: formatted, checkIn: null, checkOut: `ច្បាប់ ${durationStr}` });
           } else {
             allLeaveRecords.push({ date: dateStr, formattedDate: formatted, checkIn: `ច្បាប់ ${durationStr}`, checkOut: `ច្បាប់ ${durationStr}` });
           }
        }
      }
    });
  } catch (e) { console.error("Leave Error:", e); }

  // 2. Fetch from 'out_requests'
  try {
    const qOut = query(
      collection(dbLeave, "/artifacts/default-app-id/public/data/out_requests"),
      where("userId", "==", employeeId),
      where("status", "==", "approved")
    );
    const outSnapshot = await getDocs(qOut);
    outSnapshot.forEach((doc) => {
        const data = doc.data();
        const startDate = parseLeaveDate(data.startDate);
        if(!startDate) return;
        
        if (startDate >= startMonthDate && startDate <= endMonthDate) {
            const dateStr = getTodayDateString(startDate);
            const formatted = formatDate(startDate);
            const type = data.duration || "N/A";
            const label = `ច្បាប់ ${type}`;
            
            if (type === "មួយព្រឹក") {
                allLeaveRecords.push({ date: dateStr, formattedDate: formatted, checkIn: label, checkOut: null });
            } else if (type === "មួយរសៀល") {
                allLeaveRecords.push({ date: dateStr, formattedDate: formatted, checkIn: null, checkOut: label });
            } else {
                allLeaveRecords.push({ date: dateStr, formattedDate: formatted, checkIn: label, checkOut: label });
            }
        }
    });
  } catch (e) { console.error("Out Request Error:", e); }

  return allLeaveRecords;
}

async function mergeAndRenderHistory() {
  const mergedMap = new Map();
  // 1. Add Attendance
  for (const record of attendanceRecords) mergedMap.set(record.date, { ...record });
  
  // 2. Add Leave (Overwrite or Fill)
  for (const leave of leaveRecords) {
    const existing = mergedMap.get(leave.date);
    if (existing) {
      if (leave.checkIn && !existing.checkIn) existing.checkIn = leave.checkIn;
      if (leave.checkOut && !existing.checkOut) existing.checkOut = leave.checkOut;
    } else {
      mergedMap.set(leave.date, { ...leave });
    }
  }
  
  currentMonthRecords = Array.from(mergedMap.values());
  const todayString = getTodayDateString();
  
  currentMonthRecords.sort((a, b) => {
    const aDate = a.date || "";
    const bDate = b.date || "";
    if (aDate === todayString && bDate !== todayString) return -1;
    if (aDate !== todayString && bDate === todayString) return 1;
    return bDate.localeCompare(aDate);
  });

  renderTodayHistory();
  renderMonthlyHistory();
  await updateButtonState();
}

async function updateButtonState() {
  const todayString = getTodayDateString();
  const todayData = currentMonthRecords.find(r => r.date === todayString);
  
  let checkInDisabled = false;
  let checkOutDisabled = true;
  let statusMessage = "សូមធ្វើការ Check-in";
  let statusClass = "text-gray-500";

  // Check Data Status
  if (todayData && todayData.checkIn) {
    // If it's a leave text (e.g. "ច្បាប់..."), block checkin
    if (todayData.checkIn.includes("ច្បាប់")) {
       checkInDisabled = true;
       statusMessage = `ថ្ងៃនេះ៖ ${todayData.checkIn}`;
       statusClass = "text-blue-600";
    } else {
       // Regular Check-in
       checkInDisabled = true;
       checkOutDisabled = false; 
       statusMessage = `បាន Check-in ម៉ោង: ${todayData.checkIn}`;
       statusClass = "text-green-600";
    }
    
    if (todayData.checkOut) {
      checkOutDisabled = true;
      // If full day leave
      if (todayData.checkIn.includes("ច្បាប់") && todayData.checkOut.includes("ច្បាប់")) {
         statusMessage = `${todayData.checkIn}`;
      } else {
         statusMessage = `បាន Check-out ម៉ោង: ${todayData.checkOut}`;
         statusClass = "text-red-600";
      }
    }
  }

  // Shift Check (Visual Only since GPS is gone)
  const canCheckIn = checkShiftTime(currentUserShift, "checkIn");
  
  if (!todayData || !todayData.checkIn) {
      if (!canCheckIn) {
         // statusMessage += " (ក្រៅម៉ោង)"; // Uncomment if desired
      }
  }

  checkInButton.disabled = checkInDisabled;
  checkOutButton.disabled = checkOutDisabled;
  attendanceStatus.textContent = statusMessage;
  attendanceStatus.className = `text-center text-sm font-medium pb-4 px-6 h-10 flex items-center justify-center ${statusClass}`;
}

// ==========================================
// 4. FACE API & CAMERA
// ==========================================

async function loadAIModels() {
  const MODEL_URL = "./models";
  loadingText.textContent = "កំពុងទាញយក AI Models...";
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    console.log("AI Models Loaded");
    modelsLoaded = true;
    await fetchGoogleSheetData();
  } catch (e) {
    console.error("Error loading AI models", e);
    showMessage("បញ្ហាធ្ងន់ធ្ងរ", "មិនអាចទាញយក AI Models បានទេ។", true);
  }
}

async function prepareFaceMatcher(imageUrl) {
  currentUserFaceMatcher = null;
  if (!imageUrl || imageUrl.includes("placehold.co")) return;

  try {
    const img = await faceapi.fetchImage(imageUrl);
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (detection) {
      currentUserFaceMatcher = new faceapi.FaceMatcher(detection.descriptor);
    }
  } catch (e) {
    console.error("Face Matcher Error:", e);
  }
}

async function startFaceScan(action) {
  currentScanAction = action;
  if (!modelsLoaded || !currentUserFaceMatcher) {
    showMessage("បញ្ហា", "ប្រព័ន្ធស្កេនមុខមិនទាន់រួចរាល់ ឬគណនីគ្មានរូបថត។", true);
    return;
  }

  cameraModal.classList.remove("modal-hidden");
  cameraModal.classList.add("modal-visible");
  captureButton.style.display = "none";
  cameraLoadingText.textContent = "កំពុងបើកកាមេរ៉ា...";

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    videoElement.srcObject = videoStream;
    videoElement.onplay = () => {
      cameraLoadingText.textContent = "ត្រៀមរួចរាល់";
      captureButton.style.display = "flex";
    };
  } catch (err) {
    hideCameraModal();
    showMessage("បញ្ហា", "មិនអាចបើកកាមេរ៉ាបានទេ។", true);
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  videoElement.srcObject = null;
}

function hideCameraModal() {
  stopCamera();
  cameraModal.classList.add("modal-hidden");
  cameraModal.classList.remove("modal-visible");
}

async function handleCaptureAndAnalyze() {
  if (!videoStream) return;
  captureButton.disabled = true;
  cameraLoadingText.textContent = "កំពុងវិភាគ...";

  const displaySize = { width: videoElement.videoWidth, height: videoElement.videoHeight };
  faceapi.matchDimensions(cameraCanvas, displaySize);
  cameraCanvas.getContext("2d").drawImage(videoElement, 0, 0, displaySize.width, displaySize.height);

  try {
    const detection = await faceapi.detectSingleFace(cameraCanvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    
    if (!detection) {
      cameraLoadingText.textContent = "រកមិនឃើញមុខ!";
      captureButton.disabled = false;
      return;
    }

    const bestMatch = currentUserFaceMatcher.findBestMatch(detection.descriptor);
    
    if (bestMatch.distance < FACE_MATCH_THRESHOLD) {
      cameraLoadingText.textContent = "ជោគជ័យ!";
      setTimeout(() => {
        hideCameraModal();
        if (currentScanAction === "checkIn") handleCheckIn();
        else handleCheckOut();
      }, 500);
    } else {
      cameraLoadingText.textContent = "មុខមិនត្រូវគ្នា!";
      captureButton.disabled = false;
    }
  } catch (e) {
    cameraLoadingText.textContent = "Error!";
    captureButton.disabled = false;
  }
}

// ==========================================
// 5. MAIN CHECK-IN / CHECK-OUT LOGIC (NO GPS)
// ==========================================

async function handleCheckIn() {
  if (!attendanceCollectionRef || !currentUser) return;
  checkInButton.disabled = true;
  attendanceStatus.textContent = "កំពុងរក្សាទុក...";
  
  const now = new Date();
  const todayDocId = getTodayDateString(now);

  const data = {
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    department: currentUser.department,
    group: currentUser.group,
    grade: currentUser.grade,
    gender: currentUser.gender,
    shift: currentUserShift,
    date: todayDocId,
    checkInTimestamp: now.toISOString(),
    checkOutTimestamp: null,
    formattedDate: formatDate(now),
    checkIn: formatTime(now),
    checkOut: null,
    checkInLocation: null // GPS Removed
  };

  try {
    await setDoc(doc(attendanceCollectionRef, todayDocId), data);
    attendanceStatus.textContent = "Check-in ជោគជ័យ!";
  } catch (error) {
    console.error(error);
    showMessage("បញ្ហា", "មិនអាច Check-in បានទេ", true);
  }
}

async function handleCheckOut() {
  if (!attendanceCollectionRef) return;
  checkOutButton.disabled = true;
  attendanceStatus.textContent = "កំពុងរក្សាទុក...";

  const now = new Date();
  const todayDocId = getTodayDateString(now);
  const data = {
    checkOutTimestamp: now.toISOString(),
    checkOut: formatTime(now),
    checkOutLocation: null // GPS Removed
  };

  try {
    await updateDoc(doc(attendanceCollectionRef, todayDocId), data);
    attendanceStatus.textContent = "Check-out ជោគជ័យ!";
  } catch (error) {
    console.error(error);
    showMessage("បញ្ហា", "មិនអាច Check-out បានទេ", true);
  }
}

// ==========================================
// 6. INITIALIZATION & DATA FETCHING
// ==========================================

async function initializeAppFirebase() {
  try {
    const attendanceApp = initializeApp(firebaseConfigAttendance);
    dbAttendance = getFirestore(attendanceApp);
    authAttendance = getAuth(attendanceApp);
    sessionCollectionRef = collection(dbAttendance, "active_sessions");

    const leaveApp = initializeApp(firebaseConfigLeave, "leaveApp");
    dbLeave = getFirestore(leaveApp);

    await setupAuthListener();
  } catch (error) {
    console.error("Firebase Init Error:", error);
  }
}

async function setupAuthListener() {
  return new Promise((resolve) => {
    onAuthStateChanged(authAttendance, async (user) => {
      if (user) {
        await loadAIModels();
        resolve();
      } else {
        await signInAnonymously(authAttendance);
      }
    });
  });
}

async function fetchGoogleSheetData() {
  changeView("loadingView");
  try {
    const response = await fetch(GVIZ_URL);
    const text = await response.text();
    const jsonText = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/s)[1];
    const data = JSON.parse(jsonText);

    allEmployees = data.table.rows.map(row => {
      const c = row.c;
      if (!c[COL_INDEX.ID]?.v) return null;
      return {
        id: String(c[COL_INDEX.ID].v).trim(),
        name: c[COL_INDEX.NAME]?.v || "N/A",
        department: c[COL_INDEX.DEPT]?.v || "N/A",
        photoUrl: c[COL_INDEX.PHOTO]?.v,
        group: c[COL_INDEX.GROUP]?.v || "N/A",
        gender: c[COL_INDEX.GENDER]?.v || "N/A",
        grade: c[COL_INDEX.GRADE]?.v || "N/A",
        shiftMon: c[COL_INDEX.SHIFT_MON]?.v,
        shiftTue: c[COL_INDEX.SHIFT_TUE]?.v,
        shiftWed: c[COL_INDEX.SHIFT_WED]?.v,
        shiftThu: c[COL_INDEX.SHIFT_THU]?.v,
        shiftFri: c[COL_INDEX.SHIFT_FRI]?.v,
        shiftSat: c[COL_INDEX.SHIFT_SAT]?.v,
        shiftSun: c[COL_INDEX.SHIFT_SUN]?.v,
      };
    }).filter(e => e && e.group !== "ការងារក្រៅ" && e.group !== "បុគ្គលិក");

    renderEmployeeList(allEmployees);
    
    // Auto Login check
    const savedId = localStorage.getItem("savedEmployeeId");
    if (savedId) {
      const user = allEmployees.find(e => e.id === savedId);
      if (user) selectUser(user);
      else changeView("employeeListView");
    } else {
      changeView("employeeListView");
    }
  } catch (error) {
    console.error(error);
    showMessage("Error", "Failed to load employee data.", true);
  }
}

// ==========================================
// 7. UI RENDER FUNCTIONS (UI FIXES)
// ==========================================

function renderEmployeeList(employees) {
  const container = document.getElementById("employeeListContainer");
  if(!container) return;
  container.innerHTML = "";

  if (employees.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-gray-400">រកមិនឃើញទិន្នន័យ</div>`;
    return;
  }

  employees.forEach((emp) => {
    const card = document.createElement("div");
    // Compact Row Layout (Fixes big card issue)
    card.className = "bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3 cursor-pointer hover:bg-blue-50 active:scale-95 transition-all";
    card.innerHTML = `
      <img src="${emp.photoUrl || "https://placehold.co/48x48/e2e8f0/64748b?text=Img"}" 
           class="w-12 h-12 rounded-full object-cover border border-gray-200"
           onerror="this.src='https://placehold.co/48x48/e2e8f0/64748b?text=Err'">
      <div class="flex-1 min-w-0">
          <h3 class="text-sm font-bold text-gray-800 truncate">${emp.name}</h3>
          <p class="text-xs text-gray-500">ID: ${emp.id} <span class="text-gray-300">|</span> ${emp.group}</p>
      </div>
      <div class="text-gray-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </div>
    `;
    card.onmousedown = () => selectUser(emp);
    container.appendChild(card);
  });
}

function renderTodayHistory() {
  const container = document.getElementById("historyContainer");
  const noDataRow = document.getElementById("noHistoryRow");
  if(!container || !noDataRow) return;
  container.innerHTML = "";

  const todayString = getTodayDateString();
  const todayRecord = currentMonthRecords.find(r => r.date === todayString);

  if (!todayRecord) {
    container.appendChild(noDataRow);
    return;
  }

  // Grid Layout for Today
  const card = document.createElement("div");
  card.className = "bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden";
  
  // Helper to colorize
  const formatVal = (val, isCheckIn) => {
      if(!val) return isCheckIn ? `<span class="text-gray-400 text-sm">---</span>` : `<span class="text-gray-400 text-sm italic">មិនទាន់ចេញ</span>`;
      if(val.includes("ច្បាប់")) return `<span class="font-bold text-blue-600 text-xs whitespace-nowrap">${val.replace("ច្បាប់", "")}</span>`;
      return `<span class="font-bold ${isCheckIn ? 'text-green-700' : 'text-red-700'} whitespace-nowrap">${val}</span>`;
  };

  card.innerHTML = `
    <div class="bg-blue-600 px-4 py-2 flex justify-between items-center text-white">
       <span class="font-bold text-md">${todayRecord.formattedDate || todayRecord.date}</span>
       <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">ថ្ងៃនេះ</span>
    </div>
    <div class="p-4 grid grid-cols-2 gap-4 divide-x divide-gray-100">
       <div class="flex flex-col items-center justify-center space-y-1">
          <span class="text-xs text-gray-500 font-medium uppercase tracking-wider">ម៉ោងចូល</span>
          ${formatVal(todayRecord.checkIn, true)}
       </div>
       <div class="flex flex-col items-center justify-center space-y-1">
          <span class="text-xs text-gray-500 font-medium uppercase tracking-wider">ម៉ោងចេញ</span>
          ${formatVal(todayRecord.checkOut, false)}
       </div>
    </div>
  `;
  container.appendChild(card);
}

function renderMonthlyHistory() {
  const container = document.getElementById("monthlyHistoryContainer");
  const noDataRow = document.getElementById("noMonthlyHistoryRow");
  if(!container || !noDataRow) return;
  container.innerHTML = "";

  if (currentMonthRecords.length === 0) {
    container.appendChild(noDataRow);
    return;
  }

  currentMonthRecords.forEach(record => {
    const isToday = record.date === getTodayDateString();
    
    // Logic for display
    const checkInDisplay = record.checkIn 
        ? `<span class="font-bold ${record.checkIn.includes('ច្បាប់') ? 'text-blue-600' : 'text-green-700'} whitespace-nowrap text-sm">${record.checkIn}</span>`
        : `<span class="text-red-500 text-xs font-medium">អវត្តមាន</span>`;
        
    const checkOutDisplay = record.checkOut
        ? `<span class="font-bold ${record.checkOut.includes('ច្បាប់') ? 'text-blue-600' : 'text-red-700'} whitespace-nowrap text-sm">${record.checkOut}</span>`
        : `<span class="text-gray-400 text-xs">---</span>`;

    const card = document.createElement("div");
    const borderColor = isToday ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-gray-300";
    card.className = `bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-3 ${borderColor}`;

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2 border-b border-gray-50 pb-1">
        <span class="font-bold text-gray-800 text-sm">${record.formattedDate || record.date}</span>
        ${isToday ? '<span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold">Today</span>' : ''}
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
            <span class="text-xs text-gray-500">ចូល:</span> ${checkInDisplay}
        </div>
        <div class="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
            <span class="text-xs text-gray-500">ចេញ:</span> ${checkOutDisplay}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function selectUser(employee) {
  // Session Lock Logic
  currentDeviceId = self.crypto.randomUUID();
  localStorage.setItem("currentDeviceId", currentDeviceId);
  try {
    await setDoc(doc(sessionCollectionRef, employee.id), {
      deviceId: currentDeviceId,
      timestamp: new Date().toISOString(),
      employeeName: employee.name,
    });
  } catch(e) { console.error(e); }

  currentUser = employee;
  localStorage.setItem("savedEmployeeId", employee.id);

  // Shift Logic
  const dayKey = ["shiftSun","shiftMon","shiftTue","shiftWed","shiftThu","shiftFri","shiftSat"][new Date().getDay()];
  currentUserShift = currentUser[dayKey] || "N/A";

  // UI Updates (Matching new HTML IDs)
  profileImage.src = employee.photoUrl || "https://placehold.co/80x80/e2e8f0/64748b?text=Img";
  profileName.textContent = employee.name;
  profileId.textContent = `ID: ${employee.id}`;
  profileDepartment.textContent = employee.department;
  profileGroup.textContent = employee.group;
  profileGrade.textContent = employee.grade;
  profileShift.textContent = currentUserShift;

  // Setup Firebase Listener
  attendanceCollectionRef = collection(dbAttendance, `attendance/${employee.id}/records`);
  
  changeView("homeView");
  prepareFaceMatcher(employee.photoUrl);
  setupAttendanceListener();
  startLeaveListeners();
  startSessionListener(employee.id);
}

function setupAttendanceListener() {
  if (attendanceListener) attendanceListener();
  
  // Realtime Listener
  attendanceListener = onSnapshot(attendanceCollectionRef, async (snapshot) => {
    const { startOfMonth, endOfMonth } = getCurrentMonthRange();
    attendanceRecords = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.date >= startOfMonth && data.date <= endOfMonth) {
        attendanceRecords.push(data);
      }
    });
    await mergeAndRenderHistory();
  });
}

// Start leave listeners (restored functionality)
function startLeaveListeners() {
    if (!dbLeave || !currentUser) return;
    if (leaveCollectionListener) leaveCollectionListener();
    if (outCollectionListener) outCollectionListener();

    const employeeId = currentUser.id;
    const reFetch = async () => {
        leaveRecords = await fetchAllLeaveForMonth(employeeId);
        await mergeAndRenderHistory();
    };

    // 1. Leave Requests
    const qLeave = query(collection(dbLeave, "/artifacts/default-app-id/public/data/leave_requests"), where("userId", "==", employeeId));
    leaveCollectionListener = onSnapshot(qLeave, reFetch);

    // 2. Out Requests
    const qOut = query(collection(dbLeave, "/artifacts/default-app-id/public/data/out_requests"), where("userId", "==", employeeId));
    outCollectionListener = onSnapshot(qOut, reFetch);
}

function startSessionListener(employeeId) {
  if (sessionListener) sessionListener();
  sessionListener = onSnapshot(doc(sessionCollectionRef, employeeId), (docSnap) => {
    if (!docSnap.exists() || docSnap.data().deviceId !== localStorage.getItem("currentDeviceId")) {
      logout();
      showMessage("Logged Out", "គណនីរបស់អ្នកត្រូវបានចូលប្រើនៅលើឧបករណ៍ផ្សេង។", true);
    }
  });
}

function logout() {
  currentUser = null;
  localStorage.removeItem("savedEmployeeId");
  localStorage.removeItem("currentDeviceId");
  if (attendanceListener) attendanceListener();
  if (sessionListener) sessionListener();
  if (leaveCollectionListener) leaveCollectionListener();
  if (outCollectionListener) outCollectionListener();
  
  changeView("employeeListView");
  searchInput.value = "";
  renderEmployeeList(allEmployees);
}

// ==========================================
// 8. EVENT LISTENERS (SEARCH FIXES)
// ==========================================

// 1. INPUT: Filter List
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = allEmployees.filter(e => 
    e.name.toLowerCase().includes(term) || e.id.toLowerCase().includes(term)
  );
  renderEmployeeList(filtered);
});

// 2. FOCUS: Visual Effect + Scroll (NO JUMP)
searchInput.addEventListener("focus", () => {
  const searchWrapper = searchInput.parentElement.parentElement;
  if (searchWrapper) searchWrapper.classList.add("ring-2", "ring-blue-400", "ring-offset-2");
  setTimeout(() => searchInput.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
});

// 3. BLUR: Remove Effect
searchInput.addEventListener("blur", () => {
  const searchWrapper = searchInput.parentElement.parentElement;
  if (searchWrapper) searchWrapper.classList.remove("ring-2", "ring-blue-400", "ring-offset-2");
});

// Other Buttons
logoutButton.addEventListener("click", () => showConfirmation("ចាកចេញ", "តើអ្នកចង់ចាកចេញទេ?", "ចាកចេញ", logout));
exitAppButton.addEventListener("click", () => showConfirmation("បិទ", "បិទកម្មវិធី?", "បិទ", () => window.close()));
checkInButton.addEventListener("click", () => startFaceScan("checkIn"));
checkOutButton.addEventListener("click", () => startFaceScan("checkOut"));
modalCancelButton.addEventListener("click", hideMessage);
modalConfirmButton.addEventListener("click", () => currentConfirmCallback ? currentConfirmCallback() : hideMessage());
cameraCloseButton.addEventListener("click", hideCameraModal);
captureButton.addEventListener("click", handleCaptureAndAnalyze);

navHomeButton.addEventListener("click", () => {
    changeView("homeView");
    navHomeButton.classList.add("active-nav");
    navHistoryButton.classList.remove("active-nav");
});
navHistoryButton.addEventListener("click", () => {
    changeView("historyView");
    navHomeButton.classList.remove("active-nav");
    navHistoryButton.classList.add("active-nav");
});

// Init
document.addEventListener("DOMContentLoaded", initializeAppFirebase);
