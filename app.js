import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, doc, getDocs, getFirestore, onSnapshot, runTransaction, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const COLLECTION = "magnetRecipients2026";
const seedEmployees = [
  { id: "56445", name: "ปรัชญา", status: "รับแล้ว", proxy: "", receivedAt: new Date("2026-07-20T16:00:00+07:00") },
  { id: "53090", name: "ภัทระ", status: "รับแล้ว", proxy: "วิวัฒน์", receivedAt: new Date("2026-07-20T16:05:00+07:00") },
  { id: "84961", name: "นงนุช", status: "ยังไม่ได้รับ", proxy: "", receivedAt: null },
  { id: "61214", name: "สุธี", status: "ยังไม่ได้รับ", proxy: "", receivedAt: null },
  { id: "62600", name: "วรรณธิชา", status: "ยังไม่ได้รับ", proxy: "", receivedAt: null },
  { id: "82712", name: "สุวิสา", status: "ยังไม่ได้รับ", proxy: "", receivedAt: null }
];

const $ = selector => document.querySelector(selector);
const els = { search: $("#searchInput"), results: $("#resultList"), hint: $("#searchHint"), recent: $("#recentList"), modal: $("#modal"), modalTitle: $("#modalTitle"), modalId: $("#modalId"), proxyField: $("#proxyField"), proxyName: $("#proxyName"), formError: $("#formError"), confirm: $("#confirmButton"), toast: $("#toast"), connection: $("#connectionStatus"), restoreModal: $("#restoreModal"), restoreEmail: $("#restoreEmail"), restorePassword: $("#restorePassword"), restoreError: $("#restoreError"), confirmRestore: $("#confirmRestoreButton") };
let employees = [...seedEmployees];
let selectedId = null;
let db = null;
let auth = null;

function isConfigured() { return firebaseConfig && ["apiKey", "authDomain", "projectId", "appId"].every(key => firebaseConfig[key] && !String(firebaseConfig[key]).includes("YOUR_")); }
function setConnection(state, label) { els.connection.className = `connection-status ${state}`; els.connection.querySelector("span").textContent = label; }
function toDate(value) { if (!value) return null; if (typeof value.toDate === "function") return value.toDate(); return value instanceof Date ? value : new Date(value); }
function formatDate(value) { const date = toDate(value); return date ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(date) : ""; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c])); }

async function connectFirebase() {
  if (!isConfigured()) { setConnection("offline", "รอตั้งค่า Firebase"); showToast("กรุณาใส่ Firebase Config ในไฟล์ firebase-config.js"); renderAll(); return; }
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    await signInAnonymously(auth);
    await seedFirestoreIfEmpty();
    onSnapshot(collection(db, COLLECTION), snapshot => {
      employees = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      employees.sort((a, b) => a.id.localeCompare(b.id, "th", { numeric: true }));
      setConnection("online", "เชื่อมต่อแล้ว"); renderAll();
    }, handleFirebaseError);
  } catch (error) { handleFirebaseError(error); }
}
async function seedFirestoreIfEmpty() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const existingIds = new Set(snapshot.docs.map(item => item.id));
  const missingEmployees = seedEmployees.filter(employee => !existingIds.has(employee.id));
  if (!missingEmployees.length) return;
  const batch = writeBatch(db);
  missingEmployees.forEach(employee => { const { id, ...data } = employee; batch.set(doc(db, COLLECTION, id), data); });
  await batch.commit();
}
function handleFirebaseError(error) {
  console.error(error); setConnection("offline", "เชื่อมต่อไม่ได้");
  const hint = error?.code === "auth/operation-not-allowed" ? " กรุณาเปิด Anonymous Authentication ใน Firebase Console" : "";
  showToast(`Firebase เชื่อมต่อไม่สำเร็จ${hint}`); renderAll();
}
function updateSummary() {
  const received = employees.filter(e => e.status === "รับแล้ว").length;
  $("#totalCount").textContent = employees.length; $("#receivedCount").textContent = received; $("#remainingCount").textContent = employees.length - received;
}
function renderResults() {
  const query = els.search.value.trim().toLocaleLowerCase("th");
  const matches = query ? employees.filter(e => e.id.includes(query) || e.name.toLocaleLowerCase("th").includes(query)) : employees;
  els.hint.textContent = query ? (matches.length ? `พบ ${matches.length} รายการ` : "ไม่พบรายชื่อที่ค้นหา") : `รายชื่อทั้งหมด ${matches.length} รายการ`;
  els.results.innerHTML = matches.length ? matches.map(employeeCard).join("") : '<div class="empty-state">ไม่พบข้อมูล กรุณาตรวจสอบรหัสหรือชื่ออีกครั้ง</div>';
}
function employeeCard(e) {
  const done = e.status === "รับแล้ว";
  const detail = done ? `${formatDate(e.receivedAt)}${e.proxy ? ` · รับแทนโดย ${escapeHtml(e.proxy)}` : ""}` : "พร้อมบันทึกการรับ";
  return `<article class="employee-card"><div class="employee-info"><div class="avatar">${escapeHtml(e.name.slice(0,1))}</div><div><h4>${escapeHtml(e.name)} <span class="status-badge ${done ? "done" : ""}">${escapeHtml(e.status)}</span></h4><p>EMP ID: ${escapeHtml(e.id)}</p><small>${detail}</small></div></div><button class="primary-button" data-receive="${escapeHtml(e.id)}" ${done || !db ? "disabled" : ""}>${done ? "รับแล้ว" : "บันทึกการรับ"}</button></article>`;
}
function renderRecent() {
  const recent = employees.filter(e => e.receivedAt).sort((a,b) => toDate(b.receivedAt)-toDate(a.receivedAt)).slice(0,6);
  els.recent.innerHTML = recent.length ? recent.map(e => `<article class="recent-item"><span class="dot"></span><div><p>${escapeHtml(e.name)} <small>EMP ID: ${escapeHtml(e.id)}</small></p><small>${formatDate(e.receivedAt)}${e.proxy ? ` · รับแทนโดย ${escapeHtml(e.proxy)}` : " · รับด้วยตนเอง"}</small></div></article>`).join("") : '<div class="empty-state">ยังไม่มีรายการรับ</div>';
}
function openModal(id) {
  const employee = employees.find(item => item.id === id);
  if (!employee || employee.status === "รับแล้ว" || !db) return;
  selectedId = id; els.modalTitle.textContent = employee.name; els.modalId.textContent = `EMP ID: ${employee.id}`;
  document.querySelector('input[name="receiverType"][value="self"]').checked = true;
  els.proxyField.hidden = true; els.proxyName.value = ""; els.formError.textContent = ""; els.modal.hidden = false; document.body.style.overflow = "hidden"; els.confirm.focus();
}
function closeModal() { els.modal.hidden = true; document.body.style.overflow = ""; selectedId = null; }
function openRestoreModal() {
  if (!db) { showToast("Firebase ยังไม่พร้อมใช้งาน"); return; }
  els.restoreEmail.value = ""; els.restorePassword.value = ""; els.restoreError.textContent = ""; els.restoreModal.hidden = false; document.body.style.overflow = "hidden"; els.restoreEmail.focus();
}
function closeRestoreModal() { els.restoreModal.hidden = true; document.body.style.overflow = ""; }
async function restoreAllEmployees() {
  const email = els.restoreEmail.value.trim();
  const password = els.restorePassword.value;
  if (!email || !password) { els.restoreError.textContent = "กรุณากรอกอีเมลและรหัสผ่านผู้ดูแล"; return; }
  els.confirmRestore.disabled = true; els.confirmRestore.textContent = "กำลัง Restore...";
  try {
    await signInWithEmailAndPassword(auth, email, password);
    const snapshot = await getDocs(collection(db, COLLECTION));
    const batch = writeBatch(db);
    snapshot.docs.forEach(item => batch.update(item.ref, { status: "ยังไม่ได้รับ", receivedAt: null, proxy: "" }));
    await batch.commit(); closeRestoreModal(); showToast(`Restore รายชื่อทั้งหมด ${snapshot.size} รายการเรียบร้อยแล้ว`);
  } catch (error) {
    console.error(error);
    const authError = String(error?.code || "").startsWith("auth/");
    els.restoreError.textContent = authError ? "อีเมลหรือรหัสผ่านผู้ดูแลไม่ถูกต้อง" : "บัญชีนี้ไม่มีสิทธิ์ Restore หรือ Firestore Rules ยังไม่ได้อัปเดต";
  }
  finally { els.confirmRestore.disabled = false; els.confirmRestore.textContent = "ยืนยัน Restore"; }
}
async function confirmReceipt() {
  const employee = employees.find(item => item.id === selectedId); if (!employee || !db) return;
  const type = document.querySelector('input[name="receiverType"]:checked').value;
  const proxy = els.proxyName.value.trim();
  if (type === "proxy" && !proxy) { els.formError.textContent = "กรุณากรอกชื่อผู้รับแทน"; els.proxyName.focus(); return; }
  els.confirm.disabled = true; els.confirm.textContent = "กำลังบันทึก...";
  try {
    const employeeRef = doc(db, COLLECTION, selectedId);
    await runTransaction(db, async transaction => {
      const snapshot = await transaction.get(employeeRef);
      if (!snapshot.exists()) throw new Error("ไม่พบข้อมูลพนักงาน");
      if (snapshot.data().status === "รับแล้ว") throw new Error("รายการนี้มีผู้บันทึกรับแล้ว");
      transaction.update(employeeRef, { status: "รับแล้ว", proxy: type === "proxy" ? proxy : "", receivedAt: serverTimestamp() });
    });
    closeModal(); showToast(`บันทึกการรับของ ${employee.name} เรียบร้อยแล้ว`);
  } catch (error) { els.formError.textContent = error.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่"; }
  finally { els.confirm.disabled = false; els.confirm.textContent = "ยืนยันการรับ Magnet"; }
}
function showToast(message) { els.toast.textContent = message; els.toast.classList.add("show"); setTimeout(() => els.toast.classList.remove("show"), 3200); }
function exportCsv() {
  const rows = [["EMP ID","Firstname","status","ชื่อคนรับแทน","วันเวลาที่ได้รับ"], ...employees.map(e => [e.id,e.name,e.status,e.proxy || "",formatDate(e.receivedAt)])];
  const csv = "\ufeff" + rows.map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"})); link.download = `magnet-registration-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
function renderAll() { updateSummary(); renderResults(); renderRecent(); }

els.search.addEventListener("input", renderResults);
$("#clearSearch").addEventListener("click", () => { els.search.value = ""; renderResults(); els.search.focus(); });
els.results.addEventListener("click", event => { const button = event.target.closest("[data-receive]"); if (button) openModal(button.dataset.receive); });
document.querySelectorAll("[data-close-modal]").forEach(element => element.addEventListener("click", closeModal));
document.querySelectorAll('input[name="receiverType"]').forEach(radio => radio.addEventListener("change", event => { els.proxyField.hidden = event.target.value !== "proxy"; els.formError.textContent = ""; if (!els.proxyField.hidden) els.proxyName.focus(); }));
els.confirm.addEventListener("click", confirmReceipt); $("#exportButton").addEventListener("click", exportCsv);
$("#restoreButton").addEventListener("click", openRestoreModal);
document.querySelectorAll("[data-close-restore]").forEach(element => element.addEventListener("click", closeRestoreModal));
els.confirmRestore.addEventListener("click", restoreAllEmployees);
els.restorePassword.addEventListener("keydown", event => { if (event.key === "Enter") restoreAllEmployees(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") { if (!els.modal.hidden) closeModal(); if (!els.restoreModal.hidden) closeRestoreModal(); } });
renderAll(); connectFirebase();
