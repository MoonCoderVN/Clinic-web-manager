const normalizeText = (value = '') => value
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

const message = 'Giúp mình đặt lịch';
const normalized = normalizeText(message);

console.log('=== NODE.JS CLASSIFICATION ===');
console.log('Original:', message);
console.log('Normalized:', normalized);
console.log('');

const hasBookingFlowSignal = (text = "") =>
    /(muon dat|muon hen|cho toi dat|can dat lich|dat lich kham|ho tro dat|tu van dat lich|dang ky kham|dang ky lich|can kham|giup toi dat|huong dan dat|bat dau dat)/.test(text);

const hasBookingActionSignal = (text = "") =>
    /(dat lich|dat hen|kiem tra lich|check lich|xem lich|con cho|con slot|con lich|trong lich|lich trong|slot trong|con trong)/.test(text);

const bookingFlow = hasBookingFlowSignal(normalized);
const bookingAction = hasBookingActionSignal(normalized);

console.log('hasBookingFlowSignal:', bookingFlow);
console.log('hasBookingActionSignal:', bookingAction);
console.log('');

// Since hasBookingFlowSignal is false, check what happens next
console.log('=== ROUTING DECISION ===');
console.log('Line 73: if (hasBookingFlowSignal && !doctorNameHint && !specificDate)');
console.log('  → false (hasBookingFlowSignal = false)');
console.log('');
console.log('Line 77: if (bookingAction && hasSpecificEntities && (wantsDoctorInfo || wantsServiceInfo))');
console.log('  → falls through (no specific entities)');
console.log('');
console.log('Line 83: if (wantsDoctorInfo || wantsServiceInfo || bookingAction)');
console.log('  → TRUE because bookingAction = ' + bookingAction);
console.log('  → intent = "QUERY_INFO"');
console.log('');
console.log('Line 807: if (intent.bookingAction && !intent.hasSpecificEntities)');
console.log('  → TRUE because bookingAction = ' + bookingAction + ' AND hasSpecificEntities = false');
console.log('  → ANSWER: "Mình có thể kiểm tra lịch trống cho bạn! Bạn muốn khám với bác sĩ nào và vào ngày nào?"');
console.log('');
console.log('=== ROOT CAUSE ===');
console.log('The pattern "giup minh dat lich" does NOT match hasBookingFlowSignal regex');
console.log('because it expects "giup toi dat" (with "toi"), not "giup minh dat".');
console.log('');
console.log('It DOES match hasBookingActionSignal regex because of "dat lich".');
console.log('');
console.log('So instead of starting the BOOKING_FLOW wizard (line 145 in Python routes/chat.py),');
console.log('it triggers line 807 in Node.js which returns the "check availability" prompt.');
