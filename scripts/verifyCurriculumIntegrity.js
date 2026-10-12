import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const DEFAULT_SOURCE_FILE = path.join(REPO_ROOT, 'src/data/curriculumMaster.ts');
export const DEFAULT_GENESIS_BASELINE_FILE = path.join(
    REPO_ROOT,
    '.aistudio/artifacts/brain/5dea4553-76f0-4a81-8da8-88ed7b676961/genesis_baseline_manifest.v1.json'
);
export const DEFAULT_BASELINE_FILE = fs.existsSync(DEFAULT_GENESIS_BASELINE_FILE)
    ? DEFAULT_GENESIS_BASELINE_FILE
    : path.join(
        REPO_ROOT,
        '.aistudio/artifacts/brain/5dea4553-76f0-4a81-8da8-88ed7b676961/curriculum_baseline.json'
    );

export function computeFileSHA256(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`FILE_NOT_FOUND: Target file does not exist at "${filePath}"`);
    }
    const fileBytes = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBytes).digest('hex');
}

export function verifyIntegrity(options = {}) {
    const targetFile = options.targetFile || DEFAULT_SOURCE_FILE;
    const manifestFile = options.manifestFile || DEFAULT_BASELINE_FILE;
    const requireAccepted = options.requireAccepted ?? false;
    const requireSignature = options.requireSignature ?? false;

    // 1. Check target file existence
    if (!fs.existsSync(targetFile)) {
        return {
            passed: false,
            exitCode: 1,
            errorCode: 'PROTECTED_FILE_MISSING',
            errorMessage: `Protected file does not exist at "${targetFile}"`,
            targetFile,
            manifestFile
        };
    }

    // 2. Check manifest existence
    if (!fs.existsSync(manifestFile)) {
        return {
            passed: false,
            exitCode: 1,
            errorCode: 'MANIFEST_FILE_MISSING',
            errorMessage: `Manifest file does not exist at "${manifestFile}"`,
            targetFile,
            manifestFile
        };
    }

    // 3. Parse manifest
    let manifestData;
    try {
        const manifestRaw = fs.readFileSync(manifestFile, 'utf8');
        manifestData = JSON.parse(manifestRaw);
    } catch (parseErr) {
        return {
            passed: false,
            exitCode: 1,
            errorCode: 'MANIFEST_MALFORMED_JSON',
            errorMessage: `Manifest file is not valid JSON: ${parseErr.message}`,
            targetFile,
            manifestFile
        };
    }

    if (typeof manifestData !== 'object' || manifestData === null) {
        return {
            passed: false,
            exitCode: 1,
            errorCode: 'MANIFEST_INVALID_STRUCTURE',
            errorMessage: 'Manifest root must be an object',
            targetFile,
            manifestFile
        };
    }

    // 4. Validate schema version if present
    if (manifestData.manifest_schema_version && manifestData.manifest_schema_version !== '1.0.0') {
        return {
            passed: false,
            exitCode: 1,
            errorCode: 'UNSUPPORTED_SCHEMA_VERSION',
            errorMessage: `Unsupported manifest schema version "${manifestData.manifest_schema_version}"`,
            targetFile,
            manifestFile
        };
    }

    // 5. Validate required fields
    const expectedHash = manifestData.sha256;
    if (!expectedHash || typeof expectedHash !== 'string' || expectedHash.trim().length !== 64) {
        return {
            passed: false,
            exitCode: 1,
            errorCode: 'MISSING_REQUIRED_HASH',
            errorMessage: 'Manifest is missing a valid 64-character hex sha256 checksum',
            targetFile,
            manifestFile
        };
    }

    // 6. Acceptance status validation
    if (requireAccepted || manifestData.acceptance_status) {
        if (manifestData.acceptance_status !== 'ACCEPTED') {
            return {
                passed: false,
                exitCode: 1,
                errorCode: 'MANIFEST_NOT_ACCEPTED',
                errorMessage: `Baseline acceptance status is "${manifestData.acceptance_status || 'UNSPECIFIED'}", but ACCEPTED is required.`,
                targetFile,
                manifestFile,
                acceptanceStatus: manifestData.acceptance_status
            };
        }
    }

    // 7. Signature enforcement check
    if (requireSignature) {
        const signature = manifestData.signature;
        if (!signature || signature.status !== 'VERIFIED') {
            return {
                passed: false,
                exitCode: 1,
                errorCode: 'SIGNATURE_ENFORCEMENT_FAILED',
                errorMessage: 'Signature verification is mandatory but valid detached signature is not present.',
                targetFile,
                manifestFile
            };
        }
    }

    // 8. Compute current hash over exact bytes
    const currentHash = computeFileSHA256(targetFile);

    // 9. Compare hashes
    if (currentHash !== expectedHash) {
        return {
            passed: false,
            exitCode: 1,
            errorCode: 'HASH_MISMATCH',
            errorMessage: 'Protected curriculum master has been tampered with or modified!',
            targetFile,
            manifestFile,
            expectedHash,
            currentHash
        };
    }

    return {
        passed: true,
        exitCode: 0,
        targetFile,
        manifestFile,
        expectedHash,
        currentHash,
        timestampUTC: new Date().toISOString()
    };
}

// CLI Execution entry point
const isDirectRun = process.argv[1] && (
    path.resolve(process.argv[1]) === path.resolve(__filename)
);

if (isDirectRun) {
    const args = process.argv.slice(2);
    let customTarget;
    let customManifest;
    let requireAccepted = false;
    let requireSignature = false;
    let jsonOutput = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--manifest' && args[i + 1]) {
            customManifest = path.resolve(process.cwd(), args[i + 1]);
            i++;
        } else if (args[i] === '--target' && args[i + 1]) {
            customTarget = path.resolve(process.cwd(), args[i + 1]);
            i++;
        } else if (args[i] === '--require-accepted') {
            requireAccepted = true;
        } else if (args[i] === '--require-signature') {
            requireSignature = true;
        } else if (args[i] === '--json') {
            jsonOutput = true;
        }
    }

    const result = verifyIntegrity({
        targetFile: customTarget,
        manifestFile: customManifest,
        requireAccepted,
        requireSignature
    });

    if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log('--- CURRICULUM INTEGRITY MONITOR ---');
        console.log(`Target: ${result.targetFile}`);
        if (result.expectedHash) console.log(`Expected Hash: ${result.expectedHash}`);
        if (result.currentHash) console.log(`Current Hash:  ${result.currentHash}`);

        if (result.passed) {
            console.log('\nINTEGRITY_STATUS: PASS (Curriculum master matches current state baseline lock)');
        } else {
            console.error('\n**************************************************************');
            console.error('CRITICAL ERROR: CURRICULUM_MASTER_INTEGRITY_FAILURE!');
            console.error(result.errorMessage);
            console.error('STOP IMMEDIATELY — NO SYNTHESIS OR AUTO-REPAIR IS ALLOWED.');
            console.error('**************************************************************\n');
        }
    }

    process.exit(result.exitCode);
}
