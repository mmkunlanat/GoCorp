/*!
* Start Bootstrap - Shop Homepage v5.0.6 (https://startbootstrap.com/template/shop-homepage)
* Copyright 2013-2026 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-shop-homepage/blob/master/LICENSE)
*/
/*!
* Start Bootstrap - Shop Homepage v5.0.6 (https://startbootstrap.com/template/shop-homepage)
* Copyright 2013-2026 Start Bootstrap
* Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-shop-homepage/blob/master/LICENSE)
*/
// GoCorp Fleet Management - Vehicle Selection, Tax/Maintenance & Mileage Settlement Logic

document.addEventListener('DOMContentLoaded', function () {
    // State management
    let activeBookings = {}; // carId -> booking data (including start mileage, photo)
    let completedTrips = []; // array of finished trip records
    let currentSelectingVehicle = null;
    let currentReturningCarId = null;

    // Start Photo data
    let startPhotoDataUrl = '';
    // End Photo data
    let endPhotoDataUrl = '';

    // Elements
    const searchInput = document.getElementById('vehicleSearchInput');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const carItems = document.querySelectorAll('.car-item');
    const noResultsBox = document.getElementById('noResults');
    const cartCountBadge = document.getElementById('cartCountBadge');

    // Modals
    const bookingModalEl = document.getElementById('bookingModal');
    const bookingModal = bookingModalEl ? new bootstrap.Modal(bookingModalEl) : null;
    const returnModalEl = document.getElementById('returnModal');
    const returnModal = returnModalEl ? new bootstrap.Modal(returnModalEl) : null;
    const receiptModalEl = document.getElementById('receiptModal');
    const receiptModal = receiptModalEl ? new bootstrap.Modal(receiptModalEl) : null;
    const historyModalEl = document.getElementById('selectedFleetModal');
    const historyModal = historyModalEl ? new bootstrap.Modal(historyModalEl) : null;
    const cameraModalEl = document.getElementById('cameraModal');
    const cameraModal = cameraModalEl ? new bootstrap.Modal(cameraModalEl) : null;

    // Toast
    const toastEl = document.getElementById('bookingToast');
    const toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 4500 }) : null;

    // Helper: generate realistic dashboard odometer image as SVG DataURL
    function generateOdometerSvg(mileageKm, label) {
        const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#090d16"/>
                    <stop offset="100%" stop-color="#1e293b"/>
                </linearGradient>
                <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
                    <stop offset="100%" stop-color="#0284c7" stop-opacity="0.2"/>
                </linearGradient>
            </defs>
            <rect width="400" height="240" fill="url(#bg)" rx="12"/>
            <circle cx="200" cy="170" r="130" fill="none" stroke="#334155" stroke-width="8" stroke-dasharray="10 6"/>
            <circle cx="200" cy="170" r="105" fill="none" stroke="url(#glow)" stroke-width="4"/>
            <text x="200" y="55" fill="#94a3b8" font-size="14" font-family="'Prompt', sans-serif" font-weight="600" text-anchor="middle" letter-spacing="1">DASHBOARD ODOMETER</text>
            <text x="200" y="80" fill="#38bdf8" font-size="13" font-family="'Prompt', sans-serif" text-anchor="middle">${label || 'GOCORP VEHICLE'}</text>
            
            <!-- Digital Display Box -->
            <rect x="80" y="105" width="240" height="60" rx="8" fill="#020617" stroke="#38bdf8" stroke-width="2"/>
            <text x="200" y="146" fill="#22d3ee" font-size="28" font-family="'Courier New', monospace" font-weight="bold" text-anchor="middle" letter-spacing="3">${Number(mileageKm).toLocaleString()} km</text>
            
            <!-- Watermark: Sample Only - Cannot be used for submission -->
            <rect x="25" y="88" width="350" height="92" rx="8" fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.6)" stroke-width="2" stroke-dasharray="6 4"/>
            <text x="200" y="103" fill="#f87171" font-size="11" font-family="'Prompt', sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="0.5">⚠️ ภาพตัวอย่างเพื่ออ้างอิงเท่านั้น (SAMPLE ONLY)</text>
            <text x="200" y="174" fill="#ef4444" font-size="11" font-family="'Prompt', sans-serif" font-weight="bold" text-anchor="middle">❌ ไม่สามารถนำมาแนบส่งในระบบได้</text>
            
            <!-- Bottom Specs -->
            <text x="120" y="198" fill="#4ade80" font-size="12" font-family="'Prompt', sans-serif">● READY</text>
            <text x="280" y="198" fill="#facc15" font-size="12" font-family="'Prompt', sans-serif">FUEL 85%</text>
            <text x="200" y="222" fill="#64748b" font-size="11" font-family="'Prompt', sans-serif" text-anchor="middle">${new Date().toLocaleString('th-TH')}</text>
        </svg>
        `;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    // Helper: format ISO date-time string to readable Thai format
    function formatDateTimeDisplay(isoStr) {
        if (!isoStr) return '-';
        try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return isoStr;
            const pad = (n) => (n < 10 ? '0' : '') + n;
            const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const yearBe = d.getFullYear() > 2400 ? d.getFullYear() : d.getFullYear() + 543;
            return `${d.getDate()} ${months[d.getMonth()]} ${yearBe} ${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
        } catch (e) {
            return isoStr;
        }
    }

    // Validation for Booking Form (Modal 1)
    function validateBookingForm() {
        const btnSubmit = document.getElementById('btnSubmitBooking');
        const noticeEl = document.getElementById('bookingValidationNotice');
        if (!btnSubmit) return false;

        const startDateInput = document.getElementById('bookingStartDate');
        const startMileageInput = document.getElementById('startMileageInput');
        const passengerCountInput = document.getElementById('passengerCount');
        const destinationInput = document.getElementById('bookingDestination');

        const startDateVal = startDateInput ? startDateInput.value.trim() : '';
        const mileageVal = startMileageInput ? parseInt(startMileageInput.value, 10) : 0;
        const passengerVal = passengerCountInput ? parseInt(passengerCountInput.value, 10) : 1;
        const destinationVal = destinationInput ? destinationInput.value.trim() : '';
        const minMileage = (currentSelectingVehicle && currentSelectingVehicle.currentMileage) ? currentSelectingVehicle.currentMileage : 0;

        let missingParts = [];

        if (!startDateVal) {
            missingParts.push('วันเวลาเริ่มใช้งาน');
            if (startDateInput) startDateInput.classList.add('is-invalid');
        } else {
            if (startDateInput) startDateInput.classList.remove('is-invalid');
        }

        if (!destinationVal) {
            missingParts.push('ระบุสถานที่ไป');
            if (destinationInput) destinationInput.classList.add('is-invalid');
        } else {
            if (destinationInput) destinationInput.classList.remove('is-invalid');
        }

        if (!mileageVal || isNaN(mileageVal)) {
            missingParts.push('เลขไมล์เริ่มต้น');
            if (startMileageInput) startMileageInput.classList.add('is-invalid');
        } else if (mileageVal < minMileage) {
            missingParts.push(`เลขไมล์ต้อง ≥ ${minMileage.toLocaleString()} กม.`);
            if (startMileageInput) startMileageInput.classList.add('is-invalid');
        } else {
            if (startMileageInput) startMileageInput.classList.remove('is-invalid');
        }

        if (isNaN(passengerVal) || passengerVal < 1) {
            missingParts.push('จำนวนผู้โดยสาร');
            if (passengerCountInput) passengerCountInput.classList.add('is-invalid');
        } else {
            if (passengerCountInput) passengerCountInput.classList.remove('is-invalid');
        }

        if (!startPhotoDataUrl) {
            missingParts.push('แนบรูปถ่ายหน้าปัดไมล์จริง (รูปตัวอย่างไม่สามารถใช้ส่งได้)');
        }

        const isValid = missingParts.length === 0;

        if (isValid) {
            btnSubmit.disabled = false;
            btnSubmit.removeAttribute('disabled');
            if (noticeEl) {
                noticeEl.className = 'validation-notice is-valid-notice';
                noticeEl.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i><span>ข้อมูลและรูปถ่ายครบถ้วน พร้อมกดยืนยัน</span>';
            }
        } else {
            btnSubmit.disabled = true;
            btnSubmit.setAttribute('disabled', 'disabled');
            if (noticeEl) {
                noticeEl.className = 'validation-notice is-invalid-notice';
                noticeEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i><span>กรุณากรอก: ${missingParts.join(', ')}</span>`;
            }
        }

        return isValid;
    }

    // Validation for Return Form (Modal 2)
    function validateReturnForm() {
        const btnSubmit = document.getElementById('btnSubmitReturn');
        const noticeEl = document.getElementById('returnValidationNotice');
        if (!btnSubmit) return false;

        const booking = activeBookings[currentReturningCarId];
        if (!booking) {
            btnSubmit.disabled = true;
            btnSubmit.setAttribute('disabled', 'disabled');
            return false;
        }

        const endDateInput = document.getElementById('returnEndDateInput');
        const endMileageInput = document.getElementById('endMileageInput');

        const endDateVal = endDateInput ? endDateInput.value.trim() : '';
        const endMileageVal = endMileageInput ? parseInt(endMileageInput.value, 10) : 0;

        let missingParts = [];

        if (!endDateVal) {
            missingParts.push('วันเวลาสิ้นสุดการใช้งาน');
            if (endDateInput) endDateInput.classList.add('is-invalid');
        } else if (booking.startDate && endDateVal < booking.startDate) {
            missingParts.push('เวลาสิ้นสุดต้องไม่เกิดขึ้นก่อนเวลาเริ่มต้น');
            if (endDateInput) endDateInput.classList.add('is-invalid');
        } else {
            if (endDateInput) endDateInput.classList.remove('is-invalid');
        }

        if (!endMileageVal || isNaN(endMileageVal)) {
            missingParts.push('เลขไมล์ล่าสุด');
            if (endMileageInput) endMileageInput.classList.add('is-invalid');
        } else if (endMileageVal < booking.startMileage) {
            missingParts.push(`เลขไมล์ต้อง ≥ ${booking.startMileage.toLocaleString()} กม.`);
            if (endMileageInput) endMileageInput.classList.add('is-invalid');
        } else {
            if (endMileageInput) endMileageInput.classList.remove('is-invalid');
        }

        if (!endPhotoDataUrl) {
            missingParts.push('แนบรูปถ่ายหน้าปัดไมล์จริงหลังใช้ (รูปตัวอย่างไม่สามารถใช้ส่งได้)');
        }

        const isValid = missingParts.length === 0;

        if (isValid) {
            btnSubmit.disabled = false;
            btnSubmit.removeAttribute('disabled');
            if (noticeEl) {
                noticeEl.className = 'validation-notice is-valid-notice';
                noticeEl.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i><span>ข้อมูลและรูปถ่ายครบถ้วน พร้อมกดยืนยัน</span>';
            }
        } else {
            btnSubmit.disabled = true;
            btnSubmit.setAttribute('disabled', 'disabled');
            if (noticeEl) {
                noticeEl.className = 'validation-notice is-invalid-notice';
                noticeEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i><span>กรุณากรอก: ${missingParts.join(', ')}</span>`;
            }
        }

        return isValid;
    }

    // 1. Search and Category Filter Logic
    function filterVehicles() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const activeCategory = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';

        let visibleCount = 0;

        carItems.forEach(item => {
            const plate = (item.getAttribute('data-plate') || '').toLowerCase();
            const name = (item.getAttribute('data-name') || '').toLowerCase();
            const category = (item.getAttribute('data-category') || '').toLowerCase();

            const matchesCategory = (activeCategory === 'all') || (category === activeCategory);
            const matchesQuery = !query || plate.includes(query) || name.includes(query);

            if (matchesCategory && matchesQuery) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        if (noResultsBox) {
            noResultsBox.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterVehicles);
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterVehicles();
        });
    });

    // 2. Select Car Action (Open Booking Modal)
    document.addEventListener('click', function (e) {
        const selectBtn = e.target.closest('.btn-select-car');
        if (!selectBtn) return;

        const id = selectBtn.getAttribute('data-id');
        const plate = selectBtn.getAttribute('data-plate');
        const province = selectBtn.getAttribute('data-province');
        const name = selectBtn.getAttribute('data-name');
        const category = selectBtn.getAttribute('data-category');
        const parking = selectBtn.getAttribute('data-parking');
        const plateType = selectBtn.getAttribute('data-platetype') || 'plate-type-sedan';
        const currentMileage = parseInt(selectBtn.getAttribute('data-mileage') || '40000', 10);
        const taxDue = selectBtn.getAttribute('data-tax') || '-';
        const maintDue = selectBtn.getAttribute('data-maintenance') || '-';

        currentSelectingVehicle = {
            id,
            plate,
            province,
            name,
            category,
            parking,
            plateType,
            currentMileage,
            taxDue,
            maintDue
        };

        // Populate Modal Fields
        document.getElementById('modalPlateNumber').textContent = plate;
        document.getElementById('modalPlateProvince').textContent = province;
        document.getElementById('modalCarName').textContent = name;
        document.getElementById('modalCarCategory').textContent = category;
        document.getElementById('modalCarParking').textContent = parking;
        document.getElementById('modalPlatePreview').className = 'thai-license-plate ' + plateType;

        // Populate mileage: แสดงเลขไมล์ปัจจุบันของรถยนต์คันที่เลือก
        const startMileageInput = document.getElementById('startMileageInput');
        if (startMileageInput) {
            startMileageInput.value = currentMileage;
            startMileageInput.setAttribute('min', currentMileage);
            startMileageInput.setAttribute('readonly', 'readonly');
        }

        // Reset photo preview and destination input
        resetStartPhoto();
        const startSampleBox = document.getElementById('startSampleGuideBox');
        const startBtnText = document.getElementById('btnDemoStartPhotoText');
        if (startSampleBox) startSampleBox.classList.add('d-none');
        if (startBtnText) startBtnText.textContent = 'ดูตัวอย่าง';

        const destinationInput = document.getElementById('bookingDestination');
        if (destinationInput) {
            destinationInput.value = '';
            destinationInput.classList.remove('is-invalid');
        }

        // Set default start date-time
        const now = new Date();
        const startInput = document.getElementById('bookingStartDate');
        const pad = (n) => (n < 10 ? '0' : '') + n;
        const dateStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
        const timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes());
        if (startInput) startInput.value = dateStr + 'T' + timeStr;

        // Run validation immediately to set initial disabled state on confirm button
        validateBookingForm();

        if (bookingModal) {
            bookingModal.show();
        }
    });

    // ==========================================
    // Live Camera & Anti-Gallery Security Module
    // ==========================================
    let cameraStream = null;
    let activeCameraTarget = 'start'; // 'start' | 'end'
    let liveClockInterval = null;

    // 1. Anti-Gallery Enforcement: Checks if file was captured within the last 5 minutes
    function validateLiveCaptureFile(file) {
        if (!file) return false;
        const now = Date.now();
        const fileTime = file.lastModified || 0;
        const diffMs = Math.abs(now - fileTime);
        const maxAgeMs = 5 * 60 * 1000; // 5 minutes

        if (fileTime === 0 || diffMs > maxAgeMs) {
            const timeRecordedStr = fileTime ? new Date(fileTime).toLocaleString('th-TH') : 'ไม่พบข้อมูลเวลา';
            alert(`❌ ไม่อนุญาตให้นำรูปเก่าจากแกลเลอรีหรือไฟล์ในเครื่องมาใช้!\n\n` +
                  `• เวลาที่บันทึกของไฟล์ที่เลือก: ${timeRecordedStr}\n` +
                  `• เวลาปัจจุบันของระบบ: ${new Date().toLocaleString('th-TH')}\n\n` +
                  `⚠️ ข้อกำหนดความปลอดภัย:\n` +
                  `รูปถ่ายหน้าปัดไมล์ต้องเป็นภาพที่ถ่ายสด ณ เวลาปัจจุบันเท่านั้น (ไม่เกิน 5 นาที)\n` +
                  `กรุณากดปุ่ม "เปิดกล้องถ่ายสด" เพื่อเปิดกล้องถ่ายภาพหน้าปัดจริงทันที`);
            return false;
        }
        return true;
    }

    // 2. Burn Live Verified Watermark into Image Canvas
    function addWatermarkToImage(file, plateText, callback) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width || 800;
                canvas.height = img.height || 600;
                const ctx = canvas.getContext('2d');

                // Draw original captured image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Watermark Banner at the bottom
                const bannerHeight = Math.max(54, Math.round(canvas.height * 0.13));
                const bannerY = canvas.height - bannerHeight;

                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.fillRect(0, bannerY, canvas.width, bannerHeight);

                ctx.fillStyle = '#22c55e';
                ctx.fillRect(0, bannerY, canvas.width, 3);

                const centerY = bannerY + bannerHeight / 2;
                ctx.beginPath();
                ctx.arc(28, centerY, 7, 0, Math.PI * 2);
                ctx.fillStyle = '#22c55e';
                ctx.fill();

                const now = new Date();
                const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                const timeStr = now.toLocaleTimeString('th-TH');

                ctx.textAlign = 'left';
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(14, Math.round(bannerHeight * 0.3))}px "Prompt", sans-serif`;
                ctx.fillText(`ถ่ายสดเวลาปัจจุบัน: ${dateStr} ${timeStr} น.`, 46, centerY - 5);

                ctx.fillStyle = '#94a3b8';
                ctx.font = `${Math.max(11, Math.round(bannerHeight * 0.22))}px "Prompt", sans-serif`;
                ctx.fillText(`GoCorp Live Camera Verification • ห้ามใช้รูปจากแกลเลอรี (${plateText || 'ยานพาหนะส่วนกลาง'})`, 46, centerY + 15);

                callback(canvas.toDataURL('image/jpeg', 0.92));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 3. Update Live Clock in Camera Viewfinder
    function updateCameraClock() {
        const clockEl = document.getElementById('cameraLiveClock');
        if (clockEl) {
            const d = new Date();
            const pad = (n) => (n < 10 ? '0' + n : n);
            clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} น.`;
        }
    }

    // 4. Open Camera Viewfinder
    async function openLiveCamera(target) {
        activeCameraTarget = target;
        const cameraVideo = document.getElementById('cameraVideo');
        const fallbackNotice = document.getElementById('cameraFallbackNotice');
        const guideOverlay = document.getElementById('cameraGuideOverlay');
        const shutterBtn = document.getElementById('btnCaptureShutter');

        if (cameraModal) cameraModal.show();

        updateCameraClock();
        if (liveClockInterval) clearInterval(liveClockInterval);
        liveClockInterval = setInterval(updateCameraClock, 1000);

        if (fallbackNotice) fallbackNotice.classList.add('d-none');
        if (guideOverlay) guideOverlay.classList.remove('d-none');
        if (shutterBtn) shutterBtn.disabled = false;

        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
                if (cameraVideo) {
                    cameraVideo.srcObject = cameraStream;
                    cameraVideo.style.display = 'block';
                    await cameraVideo.play();
                }
            } else {
                throw new Error('getUserMedia not supported');
            }
        } catch (err) {
            console.warn('Camera access unavailable or denied:', err);
            if (fallbackNotice) fallbackNotice.classList.remove('d-none');
            if (guideOverlay) guideOverlay.classList.add('d-none');
            if (cameraVideo) cameraVideo.style.display = 'none';
        }
    }

    // 5. Stop Live Camera
    function stopLiveCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        if (liveClockInterval) {
            clearInterval(liveClockInterval);
            liveClockInterval = null;
        }
        const cameraVideo = document.getElementById('cameraVideo');
        if (cameraVideo) {
            cameraVideo.srcObject = null;
        }
    }

    // 6. Capture Snapshot (From WebRTC or Simulated Live Shot)
    function captureLivePhoto(forceSimulation = false) {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const isVideoActive = !forceSimulation && cameraStream && video && video.videoWidth > 0 && !video.paused;

        let width = 800;
        let height = 600;

        if (isVideoActive) {
            width = video.videoWidth;
            height = video.videoHeight;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(video, 0, 0, width, height);
        } else {
            // Live simulated dashboard snapshot
            canvas.width = width;
            canvas.height = height;

            // Automotive dashboard background
            const bgGrad = ctx.createLinearGradient(0, 0, width, height);
            bgGrad.addColorStop(0, '#0a0f1d');
            bgGrad.addColorStop(1, '#1e293b');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            // Dial Rings
            ctx.beginPath();
            ctx.arc(width / 2, height / 2 + 20, 200, 0, Math.PI * 2);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 12;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(width / 2, height / 2 + 20, 175, 0, Math.PI * 2);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Vehicle info & mileage
            const isStart = (activeCameraTarget === 'start');
            const targetMileage = isStart 
                ? (document.getElementById('startMileageInput') ? document.getElementById('startMileageInput').value : '32180')
                : (document.getElementById('endMileageInput') && document.getElementById('endMileageInput').value ? document.getElementById('endMileageInput').value : '32280');
            const plateStr = isStart
                ? (currentSelectingVehicle ? currentSelectingVehicle.plate : '1กข 8924')
                : (activeBookings[currentReturningCarId] ? activeBookings[currentReturningCarId].plate : '1กข 8924');

            ctx.fillStyle = '#94a3b8';
            ctx.font = '600 22px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GoCorp Fleet Vehicle Odometer', width / 2, 130);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 26px "Prompt", sans-serif';
            ctx.fillText(plateStr, width / 2, 170);

            // Digital Mileage Box
            ctx.fillStyle = '#020617';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            if (ctx.roundRect) {
                ctx.roundRect(width / 2 - 180, 210, 360, 90, 14);
            } else {
                ctx.rect(width / 2 - 180, 210, 360, 90);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 46px "Courier New", monospace';
            ctx.fillText(`${Number(targetMileage).toLocaleString()} km`, width / 2, 272);

            ctx.fillStyle = '#4ade80';
            ctx.font = '600 16px "Prompt", sans-serif';
            ctx.fillText('● SYSTEM READY & LIVE VERIFIED', width / 2, 340);
        }

        // Live Watermark Banner (burned directly into the canvas)
        const bannerHeight = Math.max(64, Math.round(canvas.height * 0.14));
        const bannerY = canvas.height - bannerHeight;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(0, bannerY, canvas.width, bannerHeight);

        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, bannerY, canvas.width, 3);

        const centerY = bannerY + bannerHeight / 2;
        ctx.beginPath();
        ctx.arc(32, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();

        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('th-TH');

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px "Prompt", sans-serif';
        ctx.fillText(`ถ่ายสดเวลาปัจจุบัน: ${dateStr} ${timeStr} น.`, 52, centerY - 6);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px "Prompt", sans-serif';
        ctx.fillText(`GoCorp Live Camera Verification • ห้ามใช้รูปจากแกลเลอรี`, 52, centerY + 16);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        if (activeCameraTarget === 'start') {
            setStartPhoto(dataUrl);
            const badge = document.getElementById('startPhotoTimeBadge');
            if (badge) badge.innerHTML = `<i class="bi bi-patch-check-fill me-1"></i>ถ่ายสดเมื่อ ${timeStr} น.`;
        } else {
            setEndPhoto(dataUrl);
            const badge = document.getElementById('endPhotoTimeBadge');
            if (badge) badge.innerHTML = `<i class="bi bi-patch-check-fill me-1"></i>ถ่ายสดเมื่อ ${timeStr} น.`;
        }

        stopLiveCamera();
        if (cameraModal) cameraModal.hide();
    }

    // Modal & Button Listeners for Live Camera
    const btnOpenStartCamera = document.getElementById('btnOpenStartCamera');
    const btnOpenEndCamera = document.getElementById('btnOpenEndCamera');
    const btnCaptureShutter = document.getElementById('btnCaptureShutter');
    const btnTriggerFallbackFile = document.getElementById('btnTriggerFallbackFile');
    const btnSimulateLiveShot = document.getElementById('btnSimulateLiveShot');
    const btnCancelCamera = document.getElementById('btnCancelCamera');

    if (btnOpenStartCamera) {
        btnOpenStartCamera.addEventListener('click', () => openLiveCamera('start'));
    }
    if (btnOpenEndCamera) {
        btnOpenEndCamera.addEventListener('click', () => openLiveCamera('end'));
    }
    if (btnCaptureShutter) {
        btnCaptureShutter.addEventListener('click', () => captureLivePhoto(false));
    }
    if (btnSimulateLiveShot) {
        btnSimulateLiveShot.addEventListener('click', () => captureLivePhoto(true));
    }
    if (btnTriggerFallbackFile) {
        btnTriggerFallbackFile.addEventListener('click', function () {
            if (cameraModal) cameraModal.hide();
            stopLiveCamera();
            if (activeCameraTarget === 'start' && startPhotoInput) {
                startPhotoInput.click();
            } else if (activeCameraTarget === 'end' && endPhotoInput) {
                endPhotoInput.click();
            }
        });
    }
    if (btnCancelCamera) {
        btnCancelCamera.addEventListener('click', stopLiveCamera);
    }
    if (cameraModalEl) {
        cameraModalEl.addEventListener('hidden.bs.modal', stopLiveCamera);
    }

    // Handle Start Photo Upload & Preview
    const startPhotoInput = document.getElementById('startMileagePhotoInput');
    const startPhotoContainer = document.getElementById('startPhotoContainer');
    const startPhotoDropzone = document.getElementById('startPhotoDropzone');
    const startPhotoPreview = document.getElementById('startPhotoPreview');
    const btnRemoveStartPhoto = document.getElementById('btnRemoveStartPhoto');
    const btnDemoStartPhoto = document.getElementById('btnDemoStartPhoto');

    function setStartPhoto(dataUrl) {
        startPhotoDataUrl = dataUrl;
        if (startPhotoPreview) startPhotoPreview.src = dataUrl;
        if (startPhotoContainer) startPhotoContainer.classList.remove('d-none');
        if (startPhotoDropzone) startPhotoDropzone.classList.add('d-none');
        validateBookingForm();
    }

    function resetStartPhoto() {
        startPhotoDataUrl = '';
        if (startPhotoInput) startPhotoInput.value = '';
        if (startPhotoContainer) startPhotoContainer.classList.add('d-none');
        if (startPhotoDropzone) startPhotoDropzone.classList.remove('d-none');
        const badge = document.getElementById('startPhotoTimeBadge');
        if (badge) badge.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>ภาพถ่ายสดเวลาปัจจุบัน';
        validateBookingForm();
    }

    if (startPhotoInput) {
        startPhotoInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            if (!validateLiveCaptureFile(file)) {
                startPhotoInput.value = '';
                return;
            }
            const plate = currentSelectingVehicle ? currentSelectingVehicle.plate : '';
            addWatermarkToImage(file, plate, function (watermarkedUrl) {
                setStartPhoto(watermarkedUrl);
                const badge = document.getElementById('startPhotoTimeBadge');
                if (badge) {
                    const now = new Date();
                    badge.innerHTML = `<i class="bi bi-patch-check-fill me-1"></i>ถ่ายสดเมื่อ ${now.toLocaleTimeString('th-TH')} น.`;
                }
            });
        });
    }

    if (btnRemoveStartPhoto) {
        btnRemoveStartPhoto.addEventListener('click', resetStartPhoto);
    }

    const startSampleGuideBox = document.getElementById('startSampleGuideBox');
    const startSamplePreviewImg = document.getElementById('startSamplePreviewImg');
    const btnDemoStartPhotoText = document.getElementById('btnDemoStartPhotoText');
    const btnCloseStartSample = document.getElementById('btnCloseStartSample');

    function toggleStartSampleGuide() {
        if (!startSampleGuideBox) return;
        const mileageVal = document.getElementById('startMileageInput').value || '48250';
        const demoUrl = generateOdometerSvg(mileageVal, 'ตัวอย่างหน้าปัดไมล์ก่อนขับ (SAMPLE)');
        if (startSampleGuideBox.classList.contains('d-none')) {
            if (startSamplePreviewImg) startSamplePreviewImg.src = demoUrl;
            startSampleGuideBox.classList.remove('d-none');
            if (btnDemoStartPhotoText) btnDemoStartPhotoText.textContent = 'ซ่อนตัวอย่าง';
        } else {
            startSampleGuideBox.classList.add('d-none');
            if (btnDemoStartPhotoText) btnDemoStartPhotoText.textContent = 'ดูตัวอย่าง';
        }
    }

    if (btnDemoStartPhoto) {
        btnDemoStartPhoto.addEventListener('click', toggleStartSampleGuide);
    }

    if (btnCloseStartSample) {
        btnCloseStartSample.addEventListener('click', function () {
            if (startSampleGuideBox) startSampleGuideBox.classList.add('d-none');
            if (btnDemoStartPhotoText) btnDemoStartPhotoText.textContent = 'ดูตัวอย่าง';
        });
    }

    // Current User Profile (จำลองการดึงข้อมูลจากระบบโปรไฟล์/การลงทะเบียนของผู้ใช้งาน)
    const currentUserProfile = {
        name: 'สมชาย ใจดี',
        department: 'ฝ่ายการตลาดและการขาย',
        purpose: 'เดินทางปฏิบัติงานตามภารกิจองค์กร'
    };

    // 3. Confirm Booking Form Submission (Start Trip)
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!validateBookingForm()) {
                alert('กรุณากรอกข้อมูลและแนบภาพถ่ายหน้าปัดไมล์เริ่มต้นให้ครบถ้วนก่อนกดยืนยัน');
                return;
            }

            // ดึงข้อมูลผู้ขอใช้รถจากระบบโปรไฟล์
            const requesterName = currentUserProfile.name;
            const department = currentUserProfile.department;
            const purpose = currentUserProfile.purpose;
            const destinationInput = document.getElementById('bookingDestination');
            const destination = destinationInput ? destinationInput.value.trim() : 'เดินทางปฏิบัติงาน';
            const startDate = document.getElementById('bookingStartDate').value;
            const passengers = document.getElementById('passengerCount').value;
            const startMileage = parseInt(document.getElementById('startMileageInput').value, 10);

            const finalStartPhoto = startPhotoDataUrl;

            const bookingRecord = {
                ...currentSelectingVehicle,
                bookingId: 'TRIP-' + Date.now().toString().slice(-6),
                requesterName,
                department,
                purpose,
                destination,
                startDate,
                endDate: null,
                passengers,
                startMileage,
                startPhoto: finalStartPhoto,
                startedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                status: 'in-trip'
            };

            // Save in active bookings
            activeBookings[currentSelectingVehicle.id] = bookingRecord;
            updateCartCounter();

            // Update car card UI to "กำลังใช้งาน" with Return Button
            const cardEl = document.querySelector(`.car-item[data-id="${currentSelectingVehicle.id}"]`);
            if (cardEl) {
                const innerCard = cardEl.querySelector('.car-card');
                if (innerCard) {
                    innerCard.classList.add('is-booked');
                }
                const badge = cardEl.querySelector('.card-status-badge');
                if (badge) {
                    badge.className = 'badge bg-warning text-dark position-absolute card-status-badge';
                    badge.innerHTML = `<i class="bi bi-person-fill me-1"></i> ใช้งานโดย ${requesterName}`;
                }
                const footer = cardEl.querySelector('.card-footer');
                if (footer) {
                    footer.innerHTML = `
                        <button class="btn btn-success w-100 btn-return-car shadow-sm" type="button" data-id="${currentSelectingVehicle.id}">
                            <i class="bi bi-speedometer2 me-1"></i> บันทึกคืนรถ & คำนวณเงินค่าเดินทาง
                        </button>
                    `;
                }
            }

            // Close modal & reset
            if (bookingModal) {
                bookingModal.hide();
            }
            bookingForm.reset();
            resetStartPhoto();

            // Show Toast
            showToast(`เริ่มบันทึกการเดินทาง <strong>${bookingRecord.plate}</strong> (เลขไมล์เริ่มต้น ${startMileage.toLocaleString()} กม.) เรียบร้อยแล้ว`);
        });
    }

    // 4. Return Vehicle & Mileage Settlement Trigger
    document.addEventListener('click', function (e) {
        const returnBtn = e.target.closest('.btn-return-car');
        if (!returnBtn) return;

        const carId = returnBtn.getAttribute('data-id');
        const booking = activeBookings[carId];
        if (!booking) return;

        currentReturningCarId = carId;

        // Populate Return Modal
        document.getElementById('returnModalPlate').textContent = booking.plate;
        document.getElementById('returnModalCarName').textContent = booking.name;
        document.getElementById('returnModalDriver').textContent = `${booking.requesterName} (${booking.department})`;
        document.getElementById('returnStartMileageDisplay').textContent = booking.startMileage.toLocaleString() + ' กม.';
        document.getElementById('returnStartPhotoPreview').src = booking.startPhoto;

        // Display start date-time & destination
        const returnStartDateDisplay = document.getElementById('returnStartDateDisplay');
        if (returnStartDateDisplay) {
            returnStartDateDisplay.textContent = formatDateTimeDisplay(booking.startDate);
        }
        const returnDestinationDisplay = document.getElementById('returnDestinationDisplay');
        if (returnDestinationDisplay) {
            returnDestinationDisplay.textContent = booking.destination || 'เดินทางปฏิบัติงาน';
        }

        // Pre-fill return end date-time to right now
        const returnEndDateInput = document.getElementById('returnEndDateInput');
        if (returnEndDateInput) {
            const now = new Date();
            const pad = (n) => (n < 10 ? '0' : '') + n;
            const nowIso = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
            returnEndDateInput.value = nowIso;
            if (booking.startDate) {
                returnEndDateInput.setAttribute('min', booking.startDate);
            }
        }

        // เลขไมล์สิ้นสุด: ให้ผู้ใช้กรอกเอง (ไม่ pre-fill อัตโนมัติ)
        const endInput = document.getElementById('endMileageInput');
        if (endInput) {
            endInput.value = '';
            endInput.setAttribute('min', booking.startMileage);
            endInput.classList.remove('is-invalid');
            endInput.placeholder = `กรอกเลขไมล์ที่มากกว่า ${booking.startMileage.toLocaleString()} กม.`;
        }

        // Reset end photo & sample guide box
        resetEndPhoto();
        const endSampleBox = document.getElementById('endSampleGuideBox');
        const endBtnText = document.getElementById('btnDemoEndPhotoText');
        if (endSampleBox) endSampleBox.classList.add('d-none');
        if (endBtnText) endBtnText.textContent = 'ดูตัวอย่าง';

        // Calculate initially
        recalculateSettlement(booking.startMileage);

        // Run validation immediately to set initial disabled state on return button
        validateReturnForm();

        // Close history/active trips modal if currently open, then show return modal
        if (historyModalEl && historyModalEl.classList.contains('show')) {
            let shown = false;
            const showNextModal = function () {
                if (shown) return;
                shown = true;
                historyModalEl.removeEventListener('hidden.bs.modal', showNextModal);
                if (returnModal) returnModal.show();
            };
            historyModalEl.addEventListener('hidden.bs.modal', showNextModal);
            setTimeout(showNextModal, 350);
            if (historyModal) historyModal.hide();
        } else {
            if (returnModal) {
                returnModal.show();
            }
        }
    });

    // End Photo handlers
    const endPhotoInput = document.getElementById('endMileagePhotoInput');
    const endPhotoContainer = document.getElementById('endPhotoContainer');
    const endPhotoDropzone = document.getElementById('endPhotoDropzone');
    const endPhotoPreview = document.getElementById('endPhotoPreview');
    const btnRemoveEndPhoto = document.getElementById('btnRemoveEndPhoto');
    const btnDemoEndPhoto = document.getElementById('btnDemoEndPhoto');

    function setEndPhoto(dataUrl) {
        endPhotoDataUrl = dataUrl;
        if (endPhotoPreview) endPhotoPreview.src = dataUrl;
        if (endPhotoContainer) endPhotoContainer.classList.remove('d-none');
        if (endPhotoDropzone) endPhotoDropzone.classList.add('d-none');
        validateReturnForm();
    }

    function resetEndPhoto() {
        endPhotoDataUrl = '';
        if (endPhotoInput) endPhotoInput.value = '';
        if (endPhotoContainer) endPhotoContainer.classList.add('d-none');
        if (endPhotoDropzone) endPhotoDropzone.classList.remove('d-none');
        const badge = document.getElementById('endPhotoTimeBadge');
        if (badge) badge.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>ภาพถ่ายสดเวลาปัจจุบัน';
        validateReturnForm();
    }

    if (endPhotoInput) {
        endPhotoInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            if (!validateLiveCaptureFile(file)) {
                endPhotoInput.value = '';
                return;
            }
            const booking = activeBookings[currentReturningCarId];
            const plate = booking ? booking.plate : '';
            addWatermarkToImage(file, plate, function (watermarkedUrl) {
                setEndPhoto(watermarkedUrl);
                const badge = document.getElementById('endPhotoTimeBadge');
                if (badge) {
                    const now = new Date();
                    badge.innerHTML = `<i class="bi bi-patch-check-fill me-1"></i>ถ่ายสดเมื่อ ${now.toLocaleTimeString('th-TH')} น.`;
                }
            });
        });
    }

    if (btnRemoveEndPhoto) {
        btnRemoveEndPhoto.addEventListener('click', resetEndPhoto);
    }

    const endSampleGuideBox = document.getElementById('endSampleGuideBox');
    const endSamplePreviewImg = document.getElementById('endSamplePreviewImg');
    const btnDemoEndPhotoText = document.getElementById('btnDemoEndPhotoText');
    const btnCloseEndSample = document.getElementById('btnCloseEndSample');

    function toggleEndSampleGuide() {
        if (!endSampleGuideBox) return;
        const endMileageVal = document.getElementById('endMileageInput').value || '48315';
        const demoUrl = generateOdometerSvg(endMileageVal, 'ตัวอย่างหน้าปัดไมล์สิ้นสุด (SAMPLE)');
        if (endSampleGuideBox.classList.contains('d-none')) {
            if (endSamplePreviewImg) endSamplePreviewImg.src = demoUrl;
            endSampleGuideBox.classList.remove('d-none');
            if (btnDemoEndPhotoText) btnDemoEndPhotoText.textContent = 'ซ่อนตัวอย่าง';
        } else {
            endSampleGuideBox.classList.add('d-none');
            if (btnDemoEndPhotoText) btnDemoEndPhotoText.textContent = 'ดูตัวอย่าง';
        }
    }

    if (btnDemoEndPhoto) {
        btnDemoEndPhoto.addEventListener('click', toggleEndSampleGuide);
    }

    if (btnCloseEndSample) {
        btnCloseEndSample.addEventListener('click', function () {
            if (endSampleGuideBox) endSampleGuideBox.classList.add('d-none');
            if (btnDemoEndPhotoText) btnDemoEndPhotoText.textContent = 'ดูตัวอย่าง';
        });
    }

    // 5. Live Calculation for Distance and Reimbursement
    function recalculateSettlement(startMileage) {
        const endInputEl = document.getElementById('endMileageInput');
        const endValStr = endInputEl ? endInputEl.value.trim() : '';
        const ratePerKm = parseFloat(document.getElementById('ratePerKmInput').value || '5.00');

        const distanceEl = document.getElementById('calcDistanceDisplay');
        const rateEl = document.getElementById('calcRateDisplay');
        const totalEl = document.getElementById('calcTotalDisplay');
        const formulaEl = document.getElementById('calcFormulaDisplay');

        if (rateEl) rateEl.textContent = ratePerKm.toFixed(2) + ' บ./กม.';

        if (!endValStr || isNaN(parseInt(endValStr, 10))) {
            if (distanceEl) distanceEl.textContent = '- กม.';
            if (totalEl) totalEl.textContent = '฿ 0.00 บาท';
            if (formulaEl) formulaEl.textContent = '(กรุณากรอกเลขไมล์สิ้นสุดเพื่อคำนวณเงินชดเชย)';
            return;
        }

        const endMileage = parseInt(endValStr, 10);
        if (endMileage < startMileage) {
            if (distanceEl) distanceEl.textContent = '0 กม. (ไมล์น้อยกว่าเริ่มต้น)';
            if (totalEl) totalEl.textContent = '฿ 0.00 บาท';
            if (formulaEl) formulaEl.textContent = `(เลขไมล์ต้องมากกว่าหรือเท่ากับ ${startMileage.toLocaleString()} กม.)`;
            return;
        }

        const distance = endMileage - startMileage;
        const totalAmount = distance * ratePerKm;

        if (distanceEl) distanceEl.textContent = distance.toLocaleString() + ' กม.';
        if (totalEl) totalEl.textContent = '฿ ' + totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
        if (formulaEl) formulaEl.textContent = `(ระยะทาง ${distance.toLocaleString()} กม. × ${ratePerKm.toFixed(2)} บาท/กม.)`;
    }

    const endMileageInput = document.getElementById('endMileageInput');
    const ratePerKmInput = document.getElementById('ratePerKmInput');

    if (endMileageInput) {
        endMileageInput.addEventListener('input', function () {
            const booking = activeBookings[currentReturningCarId];
            if (booking) recalculateSettlement(booking.startMileage);
            validateReturnForm();
        });
        endMileageInput.addEventListener('change', function () {
            const booking = activeBookings[currentReturningCarId];
            if (booking) recalculateSettlement(booking.startMileage);
            validateReturnForm();
        });
    }

    if (ratePerKmInput) {
        ratePerKmInput.addEventListener('input', function () {
            const booking = activeBookings[currentReturningCarId];
            if (booking) recalculateSettlement(booking.startMileage);
        });
    }

    // Input change listeners for booking modal real-time validation
    const startMileageInputEl = document.getElementById('startMileageInput');
    const bookingStartDateEl = document.getElementById('bookingStartDate');
    const passengerCountEl = document.getElementById('passengerCount');
    const bookingDestinationEl = document.getElementById('bookingDestination');
    if (startMileageInputEl) {
        startMileageInputEl.addEventListener('input', validateBookingForm);
        startMileageInputEl.addEventListener('change', validateBookingForm);
    }
    if (bookingStartDateEl) {
        bookingStartDateEl.addEventListener('input', validateBookingForm);
        bookingStartDateEl.addEventListener('change', validateBookingForm);
    }
    if (passengerCountEl) {
        passengerCountEl.addEventListener('input', validateBookingForm);
        passengerCountEl.addEventListener('change', validateBookingForm);
    }
    if (bookingDestinationEl) {
        bookingDestinationEl.addEventListener('input', validateBookingForm);
        bookingDestinationEl.addEventListener('change', validateBookingForm);
    }

    // Input change listeners for return modal real-time validation
    const returnEndDateInputEl = document.getElementById('returnEndDateInput');
    if (returnEndDateInputEl) {
        returnEndDateInputEl.addEventListener('input', validateReturnForm);
        returnEndDateInputEl.addEventListener('change', validateReturnForm);
    }

    // 6. Submit Return & Generate Reimbursement Receipt
    const returnForm = document.getElementById('returnForm');
    if (returnForm) {
        returnForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const booking = activeBookings[currentReturningCarId];
            if (!booking) return;

            if (!validateReturnForm()) {
                alert('กรุณากรอกข้อมูลและแนบภาพถ่ายหน้าปัดไมล์หลังใช้รถให้ครบถ้วนก่อนกดยืนยัน');
                return;
            }

            const endMileage = parseInt(document.getElementById('endMileageInput').value, 10);
            const ratePerKm = parseFloat(document.getElementById('ratePerKmInput').value || '5.00');
            const returnEndDate = document.getElementById('returnEndDateInput') ? document.getElementById('returnEndDateInput').value : '';

            const finalEndPhoto = endPhotoDataUrl;

            const distance = endMileage - booking.startMileage;
            const reimbursementAmount = distance * ratePerKm;

            const tripRecord = {
                ...booking,
                endDate: returnEndDate,
                endMileage,
                endPhoto: finalEndPhoto,
                ratePerKm,
                distance,
                reimbursementAmount,
                completedAt: formatDateTimeDisplay(returnEndDate)
            };

            // Store in completed trips
            completedTrips.unshift(tripRecord);
            delete activeBookings[currentReturningCarId];
            updateCartCounter();

            // Restore vehicle card to "พร้อมใช้งาน" and update its mileage
            const cardEl = document.querySelector(`.car-item[data-id="${currentReturningCarId}"]`);
            if (cardEl) {
                const innerCard = cardEl.querySelector('.car-card');
                if (innerCard) innerCard.classList.remove('is-booked');

                const badge = cardEl.querySelector('.card-status-badge');
                if (badge) {
                    badge.className = 'badge bg-success text-white position-absolute card-status-badge';
                    badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> พร้อมใช้งาน';
                }

                // Update current mileage tag on card
                const mileageTag = cardEl.querySelector('.current-mileage-tag');
                if (mileageTag) {
                    mileageTag.innerHTML = `<i class="bi bi-speedometer2 me-1"></i> ไมล์ล่าสุด: ${endMileage.toLocaleString()} กม.`;
                }

                const footer = cardEl.querySelector('.card-footer');
                if (footer) {
                    footer.innerHTML = `
                        <button class="btn btn-primary w-100 btn-select-car" type="button" 
                            data-id="${tripRecord.id}" 
                            data-plate="${tripRecord.plate}" 
                            data-name="${tripRecord.name}" 
                            data-province="${tripRecord.province}" 
                            data-category="${tripRecord.categoryName || tripRecord.category}" 
                            data-parking="${tripRecord.parking}" 
                            data-platetype="${tripRecord.plateType}"
                            data-mileage="${endMileage}"
                            data-tax="${tripRecord.taxDue}"
                            data-maintenance="${tripRecord.maintDue}">
                            <i class="bi bi-car-front-fill me-1"></i> เลือกใช้งานรถคันนี้
                        </button>
                    `;
                }
            }

            if (returnModal) returnModal.hide();

            // Populate and Show Receipt Slip
            populateReceipt(tripRecord);
            if (receiptModal) receiptModal.show();

            showToast(`คืนรถ <strong>${tripRecord.plate}</strong> สำเร็จ! เงินชดเชยที่ได้รับ <strong>฿ ${reimbursementAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</strong>`);
        });
    }

    // 7. Populate Receipt Modal
    function populateReceipt(record) {
        document.getElementById('receiptTripId').textContent = record.bookingId;
        document.getElementById('receiptPlate').textContent = record.plate;
        document.getElementById('receiptCarName').textContent = record.name;
        document.getElementById('receiptDriver').textContent = record.requesterName;
        document.getElementById('receiptDept').textContent = record.department;
        document.getElementById('receiptPurpose').textContent = record.purpose;
        const receiptDestEl = document.getElementById('receiptDestination');
        if (receiptDestEl) {
            receiptDestEl.textContent = record.destination || 'เดินทางปฏิบัติงาน';
        }
        document.getElementById('receiptCompletedAt').textContent = record.completedAt;

        const periodEl = document.getElementById('receiptTripPeriod');
        if (periodEl) {
            periodEl.textContent = `${formatDateTimeDisplay(record.startDate)} - ${formatDateTimeDisplay(record.endDate)}`;
        }

        // Mileage & Photos
        document.getElementById('receiptStartMileage').textContent = record.startMileage.toLocaleString() + ' กม.';
        document.getElementById('receiptEndMileage').textContent = record.endMileage.toLocaleString() + ' กม.';
        document.getElementById('receiptStartPhoto').src = record.startPhoto;
        document.getElementById('receiptEndPhoto').src = record.endPhoto;

        // Calculations
        document.getElementById('receiptDistance').textContent = record.distance.toLocaleString() + ' กม.';
        document.getElementById('receiptRate').textContent = record.ratePerKm.toFixed(2) + ' บาท/กม.';
        document.getElementById('receiptTotalAmount').textContent = '฿ ' + record.reimbursementAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Print Receipt
    const btnPrintReceipt = document.getElementById('btnPrintReceipt');
    if (btnPrintReceipt) {
        btnPrintReceipt.addEventListener('click', function () {
            window.print();
        });
    }

    // 8. Update Cart / Active Trips Badge
    function updateCartCounter() {
        const count = Object.keys(activeBookings).length;
        if (cartCountBadge) {
            cartCountBadge.textContent = count;
            cartCountBadge.className = count > 0 ? 'badge bg-warning text-dark ms-2 rounded-pill' : 'badge bg-light text-dark ms-2 rounded-pill';
        }
        renderHistoryList();
    }

    // Render Active & Completed Trips in Modal
    function renderHistoryList() {
        const activeListEl = document.getElementById('activeTripsList');
        const completedListEl = document.getElementById('completedTripsList');
        const emptyMsg = document.getElementById('emptyHistoryMsg');

        const activeCount = Object.keys(activeBookings).length;
        const completedCount = completedTrips.length;

        if (emptyMsg) {
            emptyMsg.style.display = (activeCount === 0 && completedCount === 0) ? 'block' : 'none';
        }

        if (activeListEl) {
            if (activeCount === 0) {
                activeListEl.innerHTML = '<p class="text-muted small">ไม่มีรถที่กำลังใช้งานอยู่ในขณะนี้</p>';
            } else {
                activeListEl.innerHTML = Object.values(activeBookings).map(item => `
                    <div class="card mb-3 border-warning shadow-sm">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <span class="badge bg-warning text-dark me-2">กำลังใช้งาน</span>
                                    <strong class="text-dark">${item.plate} - ${item.name}</strong>
                                    <div class="small text-muted mt-1">
                                        <i class="bi bi-person me-1"></i>ผู้ใช้: ${item.requesterName} (${item.department})
                                    </div>
                                    <div class="small text-muted">
                                        <i class="bi bi-geo-alt-fill text-danger me-1"></i>สถานที่ไป: <strong class="text-dark">${item.destination || '-'}</strong>
                                    </div>
                                    <div class="small text-muted">
                                        <i class="bi bi-clock me-1"></i>เริ่มใช้งาน: <strong>${formatDateTimeDisplay(item.startDate)}</strong>
                                    </div>
                                    <div class="small text-muted">
                                        <i class="bi bi-speedometer2 me-1"></i>ไมล์เริ่มต้น: <strong>${item.startMileage.toLocaleString()} กม.</strong>
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-success btn-return-car" data-id="${item.id}">
                                    <i class="bi bi-speedometer2 me-1"></i> คืนรถ & รับเงิน
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        if (completedListEl) {
            if (completedCount === 0) {
                completedListEl.innerHTML = '<p class="text-muted small">ยังไม่มีประวัติการคืนรถและเบิกเงิน</p>';
            } else {
                completedListEl.innerHTML = completedTrips.map((item, idx) => `
                    <div class="card mb-3 border-success-subtle shadow-sm">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <span class="badge bg-success me-2">เสร็จสิ้นแล้ว</span>
                                    <strong class="text-dark">${item.plate} - ${item.name}</strong>
                                    <div class="small text-muted mt-1">
                                        ผู้ใช้: ${item.requesterName} • คืนเมื่อ: <strong>${item.completedAt}</strong>
                                    </div>
                                    <div class="small text-muted">
                                        <i class="bi bi-geo-alt-fill text-danger me-1"></i>สถานที่ไป: <strong>${item.destination || '-'}</strong>
                                    </div>
                                    <div class="small text-muted">
                                        ระยะทาง: <strong>${item.distance} กม.</strong> (${item.ratePerKm} บ./กม.)
                                    </div>
                                    <div class="small text-success fw-bold">
                                        เงินที่ได้รับ: ฿ ${item.reimbursementAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-outline-primary btn-view-receipt" data-index="${idx}">
                                    <i class="bi bi-receipt me-1"></i> ดูใบสรุป
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    // View past receipt
    document.addEventListener('click', function (e) {
        const viewReceiptBtn = e.target.closest('.btn-view-receipt');
        if (!viewReceiptBtn) return;
        const index = parseInt(viewReceiptBtn.getAttribute('data-index'), 10);
        if (completedTrips[index]) {
            populateReceipt(completedTrips[index]);
            if (historyModalEl && historyModalEl.classList.contains('show')) {
                let shown = false;
                const showNextModal = function () {
                    if (shown) return;
                    shown = true;
                    historyModalEl.removeEventListener('hidden.bs.modal', showNextModal);
                    if (receiptModal) receiptModal.show();
                };
                historyModalEl.addEventListener('hidden.bs.modal', showNextModal);
                setTimeout(showNextModal, 350);
                if (historyModal) historyModal.hide();
            } else {
                if (receiptModal) receiptModal.show();
            }
        }
    });

    // Helper: Toast display
    function showToast(htmlMsg) {
        const toastMsg = document.getElementById('toastMessage');
        if (toastMsg) toastMsg.innerHTML = htmlMsg;
        if (toast) toast.show();
    }
});