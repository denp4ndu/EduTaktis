import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';
import {
    verifyIntegrity,
    computeFileSHA256,
    DEFAULT_SOURCE_FILE,
    DEFAULT_BASELINE_FILE
} from '../../scripts/verifyCurriculumIntegrity.js';

describe('Phase 42.1 — Curriculum Integrity Verifier & Genesis Baseline Regression Suite', () => {
    let tmpDir: string;
    let fixtureFilePath: string;
    let fixtureManifestPath: string;
    const sampleContent = 'export const SAMPLE_CURRICULUM = { version: "2026.1" };\n';
    let sampleHash: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edutaktis-integrity-test-'));
        fixtureFilePath = path.join(tmpDir, 'curriculumFixture.ts');
        fixtureManifestPath = path.join(tmpDir, 'manifestFixture.json');

        fs.writeFileSync(fixtureFilePath, sampleContent, 'utf8');
        sampleHash = crypto.createHash('sha256').update(Buffer.from(sampleContent, 'utf8')).digest('hex');
    });

    afterEach(() => {
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('1. Correct file hash and accepted manifest: PASS', () => {
        const manifest = {
            manifest_schema_version: '1.0.0',
            phase_identifier: '42.1',
            sha256: sampleHash,
            acceptance_status: 'ACCEPTED'
        };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(manifest), 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath,
            requireAccepted: true
        });

        expect(result.passed).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.currentHash).toBe(sampleHash);
        expect(result.expectedHash).toBe(sampleHash);
    });

    it('2. Modified test-fixture bytes: FAIL', () => {
        const manifest = {
            manifest_schema_version: '1.0.0',
            sha256: sampleHash,
            acceptance_status: 'ACCEPTED'
        };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(manifest), 'utf8');

        // Tamper with fixture file
        fs.writeFileSync(fixtureFilePath, sampleContent + '// unauthorized modification\n', 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('HASH_MISMATCH');
        expect(result.currentHash).not.toBe(sampleHash);
    });

    it('3. Missing protected file: FAIL', () => {
        const missingPath = path.join(tmpDir, 'non_existent_file.ts');
        const manifest = { sha256: sampleHash };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(manifest), 'utf8');

        const result = verifyIntegrity({
            targetFile: missingPath,
            manifestFile: fixtureManifestPath
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('PROTECTED_FILE_MISSING');
    });

    it('4. Missing manifest: FAIL', () => {
        const missingManifest = path.join(tmpDir, 'missing_manifest.json');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: missingManifest
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('MANIFEST_FILE_MISSING');
    });

    it('5. Malformed JSON: FAIL', () => {
        fs.writeFileSync(fixtureManifestPath, '{ invalid_json: true, unterminated ...', 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('MANIFEST_MALFORMED_JSON');
    });

    it('6. Missing required manifest fields: FAIL', () => {
        const invalidManifest = {
            note: 'Missing sha256 field entirely'
        };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(invalidManifest), 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('MISSING_REQUIRED_HASH');
    });

    it('7. Invalid or unsupported schema version: FAIL', () => {
        const invalidVersionManifest = {
            manifest_schema_version: '999.0.0',
            sha256: sampleHash,
            acceptance_status: 'ACCEPTED'
        };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(invalidVersionManifest), 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('UNSUPPORTED_SCHEMA_VERSION');
    });

    it('8. Baseline status PENDING_ACCEPTANCE: FAIL', () => {
        const pendingManifest = {
            manifest_schema_version: '1.0.0',
            sha256: sampleHash,
            acceptance_status: 'PENDING_ACCEPTANCE'
        };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(pendingManifest), 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath,
            requireAccepted: true
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('MANIFEST_NOT_ACCEPTED');
    });

    it('9. Expected hash mismatch: FAIL', () => {
        const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const mismatchManifest = {
            manifest_schema_version: '1.0.0',
            sha256: wrongHash,
            acceptance_status: 'ACCEPTED'
        };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(mismatchManifest), 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('HASH_MISMATCH');
    });

    it('10. Verification failure returns a nonzero exit code', () => {
        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: path.join(tmpDir, 'does_not_exist.json')
        });
        expect(result.exitCode).not.toBe(0);
        expect(result.exitCode).toBe(1);
    });

    it('11. Verification success returns exit code 0', () => {
        const manifest = { sha256: sampleHash };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(manifest), 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath
        });
        expect(result.exitCode).toBe(0);
    });

    it('12. Verification does not modify protected input bytes', () => {
        const manifest = { sha256: sampleHash };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(manifest), 'utf8');

        const beforeBytes = fs.readFileSync(fixtureFilePath);
        verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath
        });
        const afterBytes = fs.readFileSync(fixtureFilePath);

        expect(Buffer.compare(beforeBytes, afterBytes)).toBe(0);
    });

    it('13. Verification does not silently update the manifest', () => {
        const manifest = { sha256: sampleHash, note: 'immutable' };
        const rawJson = JSON.stringify(manifest, null, 2);
        fs.writeFileSync(fixtureManifestPath, rawJson, 'utf8');

        const beforeManifestBytes = fs.readFileSync(fixtureManifestPath);
        verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath
        });
        const afterManifestBytes = fs.readFileSync(fixtureManifestPath);

        expect(Buffer.compare(beforeManifestBytes, afterManifestBytes)).toBe(0);
    });

    it('14. Invalid signature or missing required signature: FAIL when signature enforcement is configured as mandatory', () => {
        const unsignedManifest = {
            manifest_schema_version: '1.0.0',
            sha256: sampleHash,
            acceptance_status: 'ACCEPTED',
            signature: {
                type: 'NONE_CONFIGURED',
                status: 'UNAVAILABLE'
            }
        };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(unsignedManifest), 'utf8');

        const result = verifyIntegrity({
            targetFile: fixtureFilePath,
            manifestFile: fixtureManifestPath,
            requireSignature: true
        });

        expect(result.passed).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.errorCode).toBe('SIGNATURE_ENFORCEMENT_FAILED');
    });

    it('15. CLI execution via subprocess returns exit code 0 on valid input', () => {
        const manifest = { sha256: sampleHash };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(manifest), 'utf8');

        const scriptPath = path.resolve(__dirname, '../../scripts/verifyCurriculumIntegrity.js');
        const output = execSync(
            `node "${scriptPath}" --target "${fixtureFilePath}" --manifest "${fixtureManifestPath}"`,
            { encoding: 'utf8' }
        );

        expect(output).toContain('INTEGRITY_STATUS: PASS');
    });

    it('16. CLI execution via subprocess returns exit code 1 on mismatch', () => {
        const badManifest = { sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' };
        fs.writeFileSync(fixtureManifestPath, JSON.stringify(badManifest), 'utf8');

        const scriptPath = path.resolve(__dirname, '../../scripts/verifyCurriculumIntegrity.js');
        let exitedCode: number | null = null;
        try {
            execSync(
                `node "${scriptPath}" --target "${fixtureFilePath}" --manifest "${fixtureManifestPath}"`,
                { stdio: 'pipe' }
            );
            exitedCode = 0;
        } catch (err: any) {
            exitedCode = err.status;
        }

        expect(exitedCode).toBe(1);
    });

    it('17. Production protected curriculum file strictly matches existing baseline manifest', () => {
        expect(fs.existsSync(DEFAULT_SOURCE_FILE)).toBe(true);
        expect(fs.existsSync(DEFAULT_BASELINE_FILE)).toBe(true);

        const prodResult = verifyIntegrity({
            targetFile: DEFAULT_SOURCE_FILE,
            manifestFile: DEFAULT_BASELINE_FILE
        });

        expect(prodResult.passed).toBe(true);
        expect(prodResult.exitCode).toBe(0);
        expect(prodResult.currentHash).toBe('91660bda4dd9585cbc5556d8fa3bb234334463fd5f3d49b9fb688b5b0f400919');
    });
});
