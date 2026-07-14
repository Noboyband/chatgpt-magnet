# Roddonjai Day 2026 — Magnet Registration

เว็บสำหรับเจ้าหน้าที่ค้นหาพนักงานและบันทึกการรับ Magnet รองรับ Notebook, Tablet และมือถือ ข้อมูลซิงก์แบบเรียลไทม์ผ่าน Firebase Cloud Firestore

## ตั้งค่า Firebase

1. สร้าง Project ที่ [Firebase Console](https://console.firebase.google.com/)
2. เพิ่ม Web app แล้วคัดลอก `firebaseConfig` มาแทนค่าใน `firebase-config.js`
3. ไปที่ **Build > Authentication > Sign-in method** และเปิด **Anonymous**
4. ไปที่ **Build > Firestore Database** แล้วสร้างฐานข้อมูล
5. นำเนื้อหาใน `firestore.rules` ไปวางที่ **Firestore Database > Rules** แล้วกด Publish
6. เปิดเว็บผ่าน GitHub Pages, Firebase Hosting หรือเว็บเซิร์ฟเวอร์ ไม่ควรเปิดด้วย `file://` เพราะ Browser บางตัวบล็อก JavaScript Module

เมื่อเชื่อมต่อครั้งแรก ระบบจะสร้างข้อมูลตั้งต้นจาก `magnet.xlsx` ใน Collection ชื่อ `magnetRecipients2026` โดยอัตโนมัติ

## Firebase Hosting (ทางเลือก)

เมื่อติดตั้ง Firebase CLI และเข้าสู่ระบบแล้ว ใช้คำสั่ง:

```text
firebase use --add
firebase deploy --only firestore:rules,hosting
```

## ความปลอดภัย

Firebase Web Config ไม่ใช่รหัสผ่าน สิทธิ์อ่านและเขียนถูกควบคุมด้วย `firestore.rules` กฎที่ให้มาบังคับให้ลงชื่อเข้าใช้แบบ Anonymous, ห้ามลบรายชื่อ และอนุญาตให้เปลี่ยนสถานะจาก “ยังไม่ได้รับ” เป็น “รับแล้ว” ได้ครั้งเดียว
