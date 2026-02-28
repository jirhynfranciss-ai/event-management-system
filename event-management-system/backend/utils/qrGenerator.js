// backend/utils/qrGenerator.js

const QRCode = require('qrcode');

/**
 * Generate QR code as data URL (base64)
 */
const generateQRDataURL = async (data) => {
    try {
        const qrDataURL = await QRCode.toDataURL(JSON.stringify(data), {
            width: 200,
            margin: 2,
            color: {
                dark: '#1a5276',
                light: '#ffffff'
            }
        });
        return qrDataURL;
    } catch (error) {
        throw new Error('QR code generation failed: ' + error.message);
    }
};

/**
 * Generate QR code as file
 */
const generateQRFile = async (data, filePath) => {
    try {
        await QRCode.toFile(filePath, JSON.stringify(data), {
            width: 200,
            margin: 2,
            color: {
                dark: '#1a5276',
                light: '#ffffff'
            }
        });
        return filePath;
    } catch (error) {
        throw new Error('QR code file generation failed: ' + error.message);
    }
};

module.exports = { generateQRDataURL, generateQRFile };