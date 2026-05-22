const normalizeText = (value = '') => value
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

const message = 'Giúp mình đặt lịch';
const normalized = normalizeText(message);

console.log('=== PYTHON CLASSIFICATION ===');
console.log('Original:', message);
console.log('Normalized:', normalized);
console.log('');

// Python patterns are slightly different
const pythonHasBookingFlowSignal = (text = "") =>
    /(muon dat|muon hen|cho toi dat|can dat lich|dat lich kham|ho tro dat|tu van dat lich|dang ky kham|dang ky lich|can kham|giup toi dat|huong dan dat|bat dau dat|toi muon dat|minh muon dat|muon kham)/.test(text);

const pythonHasBookingActionSignal = (text = "") =>
    /(dat lich|dat hen|kiem tra lich|check lich|xem lich|con cho|con slot|con lich|trong lich|lich trong|slot trong|con trong)/.test(text);

const pythonBookingFlow = pythonHasBookingFlowSignal(normalized);
const pythonBookingAction = pythonHasBookingActionSignal(normalized);

console.log('Python _has_booking_flow_signal:', pythonBookingFlow);
console.log('Python _has_booking_action_signal:', pythonBookingAction);
console.log('');

console.log('=== PYTHON ROUTING DECISION ===');
console.log('Line 86 (classifier.py): if _has_booking_flow_signal(text) and not doctor_name_hint and not specific_date:');
console.log('  → ' + (pythonBookingFlow ? 'TRUE' : 'FALSE') + ' (booking_flow_signal = ' + pythonBookingFlow + ')');

if (!pythonBookingFlow) {
    console.log('');
    console.log('Line 96 (classifier.py): if booking_action and not has_specific_entities and not doctor_name_hint:');
    console.log('  → TRUE (booking_action = ' + pythonBookingAction + ' AND has_specific_entities = false)');
    console.log('  → intent = "BOOKING_FLOW" ✓ (STARTS WIZARD)');
}

console.log('');
console.log('=== COMPARISON ===');
console.log('Node.js:   hasBookingFlowSignal = FALSE → intent = "QUERY_INFO" → line 807 response');
console.log('Python:    has_booking_flow_signal = FALSE → line 96 catches it → intent = "BOOKING_FLOW"');
console.log('');
console.log('KEY DIFFERENCE: Line 96 in Python has a fallback logic!');
console.log('');
console.log('Python lines 95-103 (fallback for generic booking without entities):');
console.log('  "if booking_action and not has_specific_entities and not doctor_name_hint:"');
console.log('  This triggers BOOKING_FLOW wizard ✓');
console.log('');
console.log('Node.js lines 73-86 (only explicit booking flow start):');
console.log('  "if (hasBookingFlowSignal && !doctorNameHint && !specificDate)"');
console.log('  Then lines 77-86 only handle specific intent types');
console.log('  Line 83: "if (wantsDoctorInfo || wantsServiceInfo || bookingAction)"');
console.log('  This only classifies as "QUERY_INFO", NOT "BOOKING_FLOW"');
