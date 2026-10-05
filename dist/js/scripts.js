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
            
            <!-- Bottom Specs -->
            <text x="120" y="195" fill="#4ade80" font-size="12" font-family="'Prompt', sans-serif">● READY</text>
            <text x="280" y="195" fill="#facc15" font-size="12" font-family="'Prompt', sans-serif">FUEL 85%</text>
            <text x="200" y="222" fill="#64748b" font-size="11" font-family="'Prompt', sans-serif" text-anchor="middle">${new Date().toLocaleString('th-TH')}</text>
        </svg>
        `;
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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

        // Populate mileage
        const startMileageInput = document.getElementById('startMileageInput');
        if (startMileageInput) {
            startMileageInput.value = currentMileage;
            startMileageInput.setAttribute('min', currentMileage);
        }

        // Reset photo preview
        resetStartPhoto();

        // Set default start/end dates
        const now = new Date();
        const startInput = document.getElementById('bookingStartDate');
        const endInput = document.getElementById('bookingEndDate');
        const pad = (n) => (n < 10 ? '0' : '') + n;
        const dateStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
        if (startInput) startInput.value = dateStr + 'T09:00';
        if (endInput) endInput.value = dateStr + 'T17:00';

        if (bookingModal) {
            bookingModal.show();
        }
    });

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
    }

    function resetStartPhoto() {
        startPhotoDataUrl = '';
        if (startPhotoInput) startPhotoInput.value = '';
        if (startPhotoContainer) startPhotoContainer.classList.add('d-none');
        if (startPhotoDropzone) startPhotoDropzone.classList.remove('d-none');
    }

    if (startPhotoInput) {
        startPhotoInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => setStartPhoto(event.target.result);
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemoveStartPhoto) {
        btnRemoveStartPhoto.addEventListener('click', resetStartPhoto);
    }

    if (btnDemoStartPhoto) {
        btnDemoStartPhoto.addEventListener('click', function () {
            const mileageVal = document.getElementById('startMileageInput').value || '48250';
            const demoUrl = generateOdometerSvg(mileageVal, 'ไมล์เริ่มต้นก่อนขับ');
            setStartPhoto(demoUrl);
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
            if (!currentSelectingVehicle) return;

            // ดึงข้อมูลผู้ขอใช้รถจากระบบโปรไฟล์
            const requesterName = currentUserProfile.name;
            const department = currentUserProfile.department;
            const purpose = currentUserProfile.purpose;
            const startDate = document.getElementById('bookingStartDate').value;
            const endDate = document.getElementById('bookingEndDate').value;
            const passengers = document.getElementById('passengerCount').value;
            const startMileage = parseInt(document.getElementById('startMileageInput').value, 10);

            if (isNaN(startMileage) || startMileage <= 0) {
                alert('กรุณากรอกเลขไมล์เริ่มต้นให้ถูกต้อง');
                return;
            }

            // If user did not upload a photo, generate demo photo automatically
            let finalStartPhoto = startPhotoDataUrl;
            if (!finalStartPhoto) {
                finalStartPhoto = generateOdometerSvg(startMileage, 'ไมล์เริ่มต้น: ' + currentSelectingVehicle.plate);
            }

            const bookingRecord = {
                ...currentSelectingVehicle,
                bookingId: 'TRIP-' + Date.now().toString().slice(-6),
                requesterName,
                department,
                purpose,
                startDate,
                endDate,
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

        // Pre-fill end mileage (start + 65 km as typical demo trip)
        const suggestedEndMileage = booking.startMileage + 65;
        const endInput = document.getElementById('endMileageInput');
        endInput.value = suggestedEndMileage;
        endInput.setAttribute('min', booking.startMileage);

        // Reset end photo
        resetEndPhoto();

        // Calculate initially
        recalculateSettlement(booking.startMileage);

        if (returnModal) {
            returnModal.show();
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
    }

    function resetEndPhoto() {
        endPhotoDataUrl = '';
        if (endPhotoInput) endPhotoInput.value = '';
        if (endPhotoContainer) endPhotoContainer.classList.add('d-none');
        if (endPhotoDropzone) endPhotoDropzone.classList.remove('d-none');
    }

    if (endPhotoInput) {
        endPhotoInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => setEndPhoto(event.target.result);
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemoveEndPhoto) {
        btnRemoveEndPhoto.addEventListener('click', resetEndPhoto);
    }

    if (btnDemoEndPhoto) {
        btnDemoEndPhoto.addEventListener('click', function () {
            const endMileageVal = document.getElementById('endMileageInput').value || '48315';
            const demoUrl = generateOdometerSvg(endMileageVal, 'ไมล์สิ้นสุดหลังใช้รถ');
            setEndPhoto(demoUrl);
        });
    }

    // 5. Live Calculation for Distance and Reimbursement
    function recalculateSettlement(startMileage) {
        const endMileage = parseInt(document.getElementById('endMileageInput').value || '0', 10);
        const ratePerKm = parseFloat(document.getElementById('ratePerKmInput').value || '5.00');

        const distance = Math.max(0, endMileage - startMileage);
        const totalAmount = distance * ratePerKm;

        const distanceEl = document.getElementById('calcDistanceDisplay');
        const rateEl = document.getElementById('calcRateDisplay');
        const totalEl = document.getElementById('calcTotalDisplay');
        const formulaEl = document.getElementById('calcFormulaDisplay');

        if (distanceEl) distanceEl.textContent = distance.toLocaleString() + ' กม.';
        if (rateEl) rateEl.textContent = ratePerKm.toFixed(2) + ' บ./กม.';
        if (totalEl) totalEl.textContent = '฿ ' + totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (formulaEl) formulaEl.textContent = `(ระยะทาง ${distance} กม. × ${ratePerKm} บาท/กม.)`;
    }

    const endMileageInput = document.getElementById('endMileageInput');
    const ratePerKmInput = document.getElementById('ratePerKmInput');

    if (endMileageInput) {
        endMileageInput.addEventListener('input', function () {
            const booking = activeBookings[currentReturningCarId];
            if (booking) recalculateSettlement(booking.startMileage);
        });
    }

    if (ratePerKmInput) {
        ratePerKmInput.addEventListener('input', function () {
            const booking = activeBookings[currentReturningCarId];
            if (booking) recalculateSettlement(booking.startMileage);
        });
    }

    // 6. Submit Return & Generate Reimbursement Receipt
    const returnForm = document.getElementById('returnForm');
    if (returnForm) {
        returnForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const booking = activeBookings[currentReturningCarId];
            if (!booking) return;

            const endMileage = parseInt(document.getElementById('endMileageInput').value, 10);
            const ratePerKm = parseFloat(document.getElementById('ratePerKmInput').value || '5.00');

            if (isNaN(endMileage) || endMileage < booking.startMileage) {
                alert('เลขไมล์สิ้นสุดต้องไม่ต่ำกว่าเลขไมล์เริ่มต้น (' + booking.startMileage.toLocaleString() + ' กม.)');
                return;
            }

            let finalEndPhoto = endPhotoDataUrl;
            if (!finalEndPhoto) {
                finalEndPhoto = generateOdometerSvg(endMileage, 'ไมล์สิ้นสุด: ' + booking.plate);
            }

            const distance = endMileage - booking.startMileage;
            const reimbursementAmount = distance * ratePerKm;

            const tripRecord = {
                ...booking,
                endMileage,
                endPhoto: finalEndPhoto,
                ratePerKm,
                distance,
                reimbursementAmount,
                completedAt: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
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
        document.getElementById('receiptCompletedAt').textContent = record.completedAt;

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
                                        ผู้ใช้: ${item.requesterName} • ระยะทาง: <strong>${item.distance} กม.</strong> (${item.ratePerKm} บ./กม.)
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
            if (historyModal) historyModal.hide();
            if (receiptModal) receiptModal.show();
        }
    });

    // Helper: Toast display
    function showToast(htmlMsg) {
        const toastMsg = document.getElementById('toastMessage');
        if (toastMsg) toastMsg.innerHTML = htmlMsg;
        if (toast) toast.show();
    }
});