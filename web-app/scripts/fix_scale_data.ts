/**
 * Migration Script: Fix Inconsistent Scale Data
 * 
 * Problem: Some scales have isOneOff: true but also have recurring patterns,
 * causing the recurrent delete modal not to appear.
 * 
 * Solution: Update all scales where isOneOff: true to set patternType: 'custom'
 * and cycleLength: 1 to match one-off semantics.
 * 
 * Run this script ONCE to fix existing data.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixInconsistentScales() {
    console.log('🔍 Scanning for inconsistent scales...\n');

    const scalesRef = collection(db, 'scales');
    const snapshot = await getDocs(scalesRef);

    let fixed = 0;
    let skipped = 0;

    for (const docSnap of snapshot.docs) {
        const scale = docSnap.data();
        const scaleId = docSnap.id;

        // Check if scale has isOneOff: true but a recurring pattern
        if (scale.isOneOff === true && scale.patternType !== 'custom') {
            console.log(`❌ Found inconsistent scale: ${scale.name} (${scaleId})`);
            console.log(`   - Current: isOneOff=true, patternType=${scale.patternType}, cycleLength=${scale.cycleLength}`);

            // Fix: Update to make it truly one-off
            await updateDoc(doc(db, 'scales', scaleId), {
                patternType: 'custom',
                cycleLength: 1
            });

            console.log(`   ✅ Fixed: patternType=custom, cycleLength=1\n`);
            fixed++;
        } else {
            skipped++;
        }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Fixed: ${fixed} scales`);
    console.log(`   - Skipped: ${skipped} scales (already correct)`);
}

fixInconsistentScales()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
