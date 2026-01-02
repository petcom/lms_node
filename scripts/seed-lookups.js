/* eslint-disable no-console */
const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://localhost:27017/lms';
const uri = process.env.MONGO_URI || process.env.MONGO_TEST_URI || DEFAULT_URI;

const lookupSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    value: { type: String, required: true },
  },
  { timestamps: true, collection: 'lookups' }
);

lookupSchema.index({ type: 1, value: 1 }, { unique: true });

const Lookup = mongoose.model('Lookup', lookupSchema);

const seedData = [
  // Sex
  { type: 'sex', value: 'Male' },
  { type: 'sex', value: 'Female' },
  { type: 'sex', value: 'Intersex' },
  { type: 'sex', value: 'Other' },
  { type: 'sex', value: 'PreferNotToSay' },

  // Gender
  { type: 'gender', value: 'Male' },
  { type: 'gender', value: 'Female' },
  { type: 'gender', value: 'TransM' },
  { type: 'gender', value: 'TransF' },
  { type: 'gender', value: 'NonBinary' },
  { type: 'gender', value: 'Genderqueer' },
  { type: 'gender', value: 'Agender' },
  { type: 'gender', value: 'TwoSpirit' },
  { type: 'gender', value: 'Other' },
  { type: 'gender', value: 'PreferNotToSay' },

  // Pronouns
  { type: 'pronouns', value: 'He/Him' },
  { type: 'pronouns', value: 'She/Her' },
  { type: 'pronouns', value: 'They/Them' },
  { type: 'pronouns', value: 'He/They' },
  { type: 'pronouns', value: 'She/They' },
  { type: 'pronouns', value: 'Ze/Hir' },
  { type: 'pronouns', value: 'PreferNotToSay' },
  { type: 'pronouns', value: 'Other' },

  // Honorifics
  { type: 'honorific', value: 'Mr.' },
  { type: 'honorific', value: 'Mrs.' },
  { type: 'honorific', value: 'Ms.' },
  { type: 'honorific', value: 'Mx.' },
  { type: 'honorific', value: 'Dr.' },
  { type: 'honorific', value: 'Prof.' },
  { type: 'honorific', value: 'Rev.' },
  { type: 'honorific', value: 'Fr.' },
  { type: 'honorific', value: 'Sr.' },
  { type: 'honorific', value: 'Sra.' },
  { type: 'honorific', value: 'Esq.' },
  { type: 'honorific', value: 'Hon.' },
  { type: 'honorific', value: 'Dame' },
  { type: 'honorific', value: 'Sir' },
];

const run = async () => {
  await mongoose.connect(uri);

  for (const item of seedData) {
    await Lookup.updateOne(
      { type: item.type, value: item.value },
      { $setOnInsert: item },
      { upsert: true }
    );
  }

  const count = await Lookup.countDocuments({});
  console.log(`✅ Seeded lookups. Total count: ${count}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('❌ Failed to seed lookups', err);
  process.exit(1);
});
