// Canonical mock visit data — the contract every ambient-workflow screen consumes.
// Shape is intentionally frozen: DoctorNotes, PatientCard, Invoice, FollowUps and
// Overview all read from MOCK_VISITS. Do not reshape without updating all consumers.

export const MOCK_VISITS = [
  {
    id: 'v-bella',
    status: 'live', // live | draft | reviewed
    startedAt: '2026-07-18T10:02:00',
    visitType: 'Annual checkup & vaccination',
    doctor: 'Dr. Martinez',
    patient: {
      id: 'p-bella',
      name: 'Bella',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: '5y',
      sex: 'F/S',
      weight: '65 lbs',
      isNew: false,
      owner: { name: 'Sarah Johnson', phone: '+1 (217) 555-0142' },
      problems: ['Subcutaneous lipoma, right shoulder (monitoring)'],
      medications: [],
      allergies: [],
    },
    transcript: [
      ['DR', 'Good morning Sarah, come on in. How has Bella been doing since last year?'],
      ['OWNER', 'Morning! She has been great overall. Eating well, tons of energy on walks.'],
      ['DR', 'That is wonderful. Any changes in appetite, drinking, or bathroom habits?'],
      ['OWNER', 'No, all normal. The one thing is I found a small lump near her right shoulder a few weeks ago.'],
      ['DR', 'Okay, let us take a look at that. Has it changed in size, or does it seem to bother her when you touch it?'],
      ['OWNER', 'It has not really grown, and she does not flinch when I press on it.'],
      ['DR', 'Good. Let me get her weight and vitals first. Up on the scale, Bella. Sixty-five pounds, same as last year, nice.'],
      ['OWNER', 'She has been holding steady.'],
      ['DR', 'Temperature is 101.2, heart rate 80, respiration 20 — all in normal range. Body condition looks ideal, a solid 5 out of 9.'],
      ['OWNER', 'Great.'],
      ['DR', 'Now the lump. It is soft, about one centimeter, moves freely under the skin, and is not painful. This looks like a benign lipoma — a fatty deposit.'],
      ['OWNER', 'Is that something to worry about?'],
      ['DR', 'Usually not. They are very common in older dogs. I would like to do a quick fine-needle aspirate to confirm, and we will monitor it for any change.'],
      ['OWNER', 'That makes sense. Go ahead.'],
      ['DR', 'Listening to her heart and lungs — both clear, nice regular rhythm. Teeth look good, just a little tartar on the upper premolars.'],
      ['OWNER', 'I have been meaning to ask about her teeth.'],
      ['DR', 'Nothing urgent, but a dental cleaning in the next six months would keep it from progressing. Now, is she due for vaccines this year?'],
      ['OWNER', 'I think so — the rabies and the combo one.'],
      ['DR', 'Correct. She is due for her rabies booster and the DHPP. I will give both today. Any reactions to vaccines in the past?'],
      ['OWNER', 'No, never.'],
      ['DR', 'Perfect. We will also send home heartworm prevention since we are heading into summer. Has she been on it year-round?'],
      ['OWNER', 'Yes, every month.'],
      ['DR', 'Great, I will refill that. So to summarize: Bella is healthy, the lump looks benign but we will aspirate to be sure, vaccines today, and let us plan a dental cleaning.'],
      ['OWNER', 'Sounds good. When will the lump results come back?'],
      ['DR', 'A few days. We will call you, and I would like to recheck it in two weeks regardless. My team will set that up on your way out.'],
      ['OWNER', 'Thank you so much, doctor.'],
    ],
    qa: [],
    soap: {
      summary:
        'Bella is a 5-year-old spayed female Golden Retriever presenting for an annual wellness exam and vaccination. Owner reports excellent overall health with a newly noticed soft mass at the right shoulder. Exam is unremarkable aside from a benign-appearing subcutaneous mass and mild dental tartar. Vaccines administered; fine-needle aspirate obtained.',
      subjective: [
        'Excellent appetite, energy, and activity per owner',
        'No changes in thirst, urination, or stool',
        'Owner found a small mass near right shoulder ~3 weeks ago; not growing, non-painful',
        'No prior vaccine reactions; on monthly heartworm prevention year-round',
      ],
      objective: [
        'Weight 65 lbs (stable); BCS 5/9',
        'T 101.2°F, HR 80 bpm, RR 20 rpm',
        'R shoulder: ~1 cm subcutaneous mass, soft, freely mobile, non-painful',
        'Heart: regular rhythm, no murmur. Lungs: clear bilaterally',
        'Dental: mild tartar on upper premolars; no gingivitis',
      ],
      assessment: [
        'Healthy adult dog — routine wellness',
        'Subcutaneous mass, R shoulder — likely lipoma, FNA obtained to confirm',
        'Grade 1 dental tartar',
      ],
      plan: [
        'Rabies booster administered today',
        'DHPP booster administered today',
        'Fine-needle aspirate of R shoulder mass — submitted to lab',
        'Recheck mass in 2 weeks; call owner with cytology results',
        'Refill monthly heartworm prevention (6 doses)',
        'Recommend dental cleaning within 6 months',
      ],
    },
    followups: [
      { id: 'fu-bella-1', label: 'Call owner with FNA cytology results', owner: 'Dr. Martinez', due: '2026-07-22', channel: 'Phone', done: false },
      { id: 'fu-bella-2', label: 'Recheck R shoulder mass', owner: 'Front desk', due: '2026-08-01', channel: 'SMS', done: false },
      { id: 'fu-bella-3', label: 'Schedule dental cleaning', owner: 'Front desk', due: '2026-09-15', channel: 'Email', done: false },
    ],
    invoice: {
      status: 'draft', // draft | finalized
      taxRate: 0.08,
      lines: [
        { id: 'li-b1', desc: 'Wellness examination', code: 'SNOMED 448337001', source: 'Objective', qty: 1, price: 65 },
        { id: 'li-b2', desc: 'Rabies vaccination (1 yr)', code: 'CVX 90', source: 'Plan', qty: 1, price: 28 },
        { id: 'li-b3', desc: 'DHPP booster', code: 'CVX 20', source: 'Plan', qty: 1, price: 34 },
        { id: 'li-b4', desc: 'Fine-needle aspirate + cytology', code: 'SNOMED 168537006', source: 'Plan', qty: 1, price: 95 },
        { id: 'li-b5', desc: 'Heartworm prevention (6 mo)', code: 'RxNorm 310451', source: 'Plan', qty: 1, price: 72 },
      ],
    },
  },

  {
    id: 'v-max',
    status: 'draft',
    startedAt: '2026-07-18T09:12:00',
    visitType: 'Lameness exam — front left leg',
    doctor: 'Dr. Martinez',
    patient: {
      id: 'p-max',
      name: 'Max',
      species: 'Cat',
      breed: 'Domestic Shorthair',
      age: '3y',
      sex: 'M/N',
      weight: '11 lbs',
      isNew: true,
      owner: { name: 'Daniel Rivera', phone: '+1 (217) 555-0199' },
      problems: [],
      medications: [],
      allergies: [],
    },
    transcript: [
      ['DR', 'Hi Daniel, thanks for bringing Max in. What is going on with him today?'],
      ['OWNER', 'He started limping on his front left leg two days ago. He is favoring it, especially after he jumps down from the couch.'],
      ['DR', 'Any known trauma — a fall, a fight with another animal, anything you saw happen?'],
      ['OWNER', 'Not that I saw. He is indoor only. No other pets.'],
      ['DR', 'Is he still eating and using the litter box normally?'],
      ['OWNER', 'Yes, appetite is totally normal. He is just gimpy.'],
      ['DR', 'Let me examine that leg. I am going to gently flex the paw and each joint. Tell me if he reacts.'],
      ['OWNER', 'Okay.'],
      ['DR', 'He is guarding the wrist a little. No obvious fracture — no crepitus, no instability. Let me check between the toes for anything stuck.'],
      ['OWNER', 'He was licking at his paw a lot yesterday.'],
      ['DR', 'There it is — a small puncture and some swelling in the paw pad, looks like the early stage of an abscess, possibly from a splinter or a claw.'],
      ['OWNER', 'Oh no. Is that painful?'],
      ['DR', 'It is tender, but very treatable. Weight is 11 pounds, temperature is slightly up at 102.9, which fits a localized infection.'],
      ['OWNER', 'What do we do?'],
      ['DR', 'I will clean and flush the wound today, start him on an antibiotic — a course of amoxicillin-clavulanate — and a pain and anti-inflammatory. Keep him from licking it.'],
      ['OWNER', 'Does he need an e-collar?'],
      ['DR', 'Yes, I will send one home. If the swelling worsens or it opens up, we may need to lance and drain it, but I think we caught it early.'],
      ['OWNER', 'How long on the antibiotics?'],
      ['DR', 'Ten days, twice a day with food. I want to recheck the paw in five days to make sure it is healing.'],
      ['OWNER', 'Got it. He is a new patient here — do you need his history?'],
      ['DR', 'My team already started his chart. We will get his prior records. Let us also set up the recheck before you leave.'],
      ['OWNER', 'Perfect, thank you.'],
    ],
    qa: [],
    soap: {
      summary:
        'Max is a 3-year-old neutered male Domestic Shorthair, new patient, presenting for acute left forelimb lameness of 2 days. Exam localizes a paw-pad puncture wound with early abscess formation and a low-grade fever. Wound cleaned and flushed; antibiotics, analgesia, and e-collar dispensed.',
      subjective: [
        'Acute L forelimb limp x2 days, worse after jumping down',
        'No witnessed trauma; indoor-only, no other pets',
        'Normal appetite and litter box use',
        'Owner noted excessive paw licking yesterday',
      ],
      objective: [
        'Weight 11 lbs; T 102.9°F (mildly elevated)',
        'L forelimb: guarding at carpus, no crepitus or joint instability',
        'L paw pad: small puncture with localized swelling — early abscess',
        'No fracture palpable; ambulatory with weight-bearing lameness',
      ],
      assessment: [
        'Paw-pad puncture wound with early abscess, L forelimb',
        'Secondary lameness',
        'Low-grade fever consistent with localized infection',
      ],
      plan: [
        'Clean and flush wound in-clinic today',
        'Amoxicillin-clavulanate 62.5 mg PO BID x10 days with food',
        'Robenacoxib for pain/inflammation x3 days',
        'E-collar dispensed to prevent licking',
        'Recheck paw in 5 days; lance/drain if abscess progresses',
        'Obtain prior records (new patient)',
      ],
    },
    followups: [
      { id: 'fu-max-1', label: 'Recheck paw / abscess', owner: 'Dr. Martinez', due: '2026-07-23', channel: 'SMS', done: false },
      { id: 'fu-max-2', label: 'Request prior records from previous vet', owner: 'Front desk', due: '2026-07-19', channel: 'Email', done: false },
      { id: 'fu-max-3', label: 'Antibiotic completion check-in', owner: 'Front desk', due: '2026-07-28', channel: 'SMS', done: false },
    ],
    invoice: {
      status: 'draft',
      taxRate: 0.08,
      lines: [
        { id: 'li-m1', desc: 'Problem-focused examination', code: 'SNOMED 185349003', source: 'Objective', qty: 1, price: 55 },
        { id: 'li-m2', desc: 'Wound cleaning & flush', code: 'SNOMED 225113003', source: 'Plan', qty: 1, price: 48 },
        { id: 'li-m3', desc: 'Amoxicillin-clavulanate (10 day course)', code: 'RxNorm 562251', source: 'Plan', qty: 1, price: 26 },
        { id: 'li-m4', desc: 'Robenacoxib (3 day)', code: 'RxNorm 1araw', source: 'Plan', qty: 1, price: 19 },
        { id: 'li-m5', desc: 'E-collar', code: 'SUPPLY EC-M', source: 'Plan', qty: 1, price: 14 },
        { id: 'li-m6', desc: 'New patient record setup', code: 'ADMIN NP', source: 'Plan', qty: 1, price: 0 },
      ],
    },
  },

  {
    id: 'v-duke',
    status: 'reviewed',
    startedAt: '2026-07-17T15:40:00',
    visitType: 'Respiratory recheck',
    doctor: 'Dr. Lee',
    patient: {
      id: 'p-duke',
      name: 'Duke',
      species: 'Dog',
      breed: 'French Bulldog',
      age: '6y',
      sex: 'M/N',
      weight: '28 lbs',
      isNew: false,
      owner: { name: 'Priya Nair', phone: '+1 (217) 555-0177' },
      problems: ['Brachycephalic airway syndrome'],
      medications: ['Theophylline'],
      allergies: [],
    },
    transcript: [
      ['DR', 'Hi Priya, how has Duke been breathing since we adjusted his medication?'],
      ['OWNER', 'Better. Less of that loud snorting at night.'],
      ['DR', 'Good. Let me listen to his chest and check his airway.'],
      ['OWNER', 'He still gets winded on hot days though.'],
      ['DR', 'That is expected with his anatomy. Lungs sound clear today, no wheeze. We will keep him on the current dose and avoid heat and over-exercise.'],
      ['OWNER', 'Okay, thank you.'],
    ],
    qa: [],
    soap: {
      summary:
        'Duke is a 6-year-old neutered male French Bulldog with brachycephalic airway syndrome, here for a respiratory recheck. Improved nocturnal stertor on current theophylline. Lungs clear; continue current management and heat avoidance.',
      subjective: ['Improved nighttime snorting per owner', 'Still exercise/heat intolerant'],
      objective: ['Weight 28 lbs', 'Lungs clear, no wheeze', 'Mild stertor at rest'],
      assessment: ['Brachycephalic airway syndrome — stable/improved'],
      plan: ['Continue theophylline at current dose', 'Strict heat and exertion avoidance', 'Recheck in 3 months'],
    },
    followups: [
      { id: 'fu-duke-1', label: '3-month respiratory recheck', owner: 'Front desk', due: '2026-10-17', channel: 'SMS', done: false },
    ],
    invoice: {
      status: 'finalized',
      taxRate: 0.08,
      lines: [
        { id: 'li-d1', desc: 'Recheck examination', code: 'SNOMED 185349003', source: 'Objective', qty: 1, price: 45 },
        { id: 'li-d2', desc: 'Theophylline refill', code: 'RxNorm 10154', source: 'Plan', qty: 1, price: 22 },
      ],
    },
  },
]

// Canned grounded answers for the in-call Q&A box (Phase A). Keyword-matched
// against the live visit; falls back to a generic grounded reply.
export const MOCK_ANSWERS = [
  { match: /weight|weigh|lbs|pounds/i, answer: 'Bella weighs 65 lbs today — unchanged from her last annual visit. Body condition score 5/9 (ideal).' },
  { match: /vaccin|rabies|dhpp|shot|booster/i, answer: 'Bella is due for her rabies booster and DHPP today. No history of vaccine reactions on file.' },
  { match: /medication|meds|heartworm|prevention|drug/i, answer: 'No active medications. She is on monthly heartworm prevention year-round; a refill is planned this visit.' },
  { match: /lump|mass|lipoma|shoulder/i, answer: 'Owner noticed a ~1 cm soft, mobile, non-painful mass at the right shoulder ~3 weeks ago. Not growing. Likely lipoma — FNA planned to confirm.' },
  { match: /allerg/i, answer: 'No known allergies documented for Bella.' },
  { match: /dental|teeth|tartar/i, answer: 'Mild tartar on the upper premolars, no gingivitis. A dental cleaning within 6 months is recommended.' },
  { match: /last visit|history|previous/i, answer: 'Last annual visit was one year ago; weight and exam were within normal limits. Active problem: monitoring a right-shoulder mass.' },
]

export function answerFor(question) {
  const hit = MOCK_ANSWERS.find((a) => a.match.test(question))
  return hit ? hit.answer : 'Based on the transcript and Bella\u2019s chart so far, I don\u2019t have that specific detail recorded. Everything discussed this visit points to a healthy annual exam with a benign-appearing mass under evaluation.'
}
