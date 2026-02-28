// backend/utils/pdfGenerator.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a professional PDF certificate
 */
const generateCertificatePDF = ({
    studentName,
    eventTitle,
    eventDate,
    organizer,
    speaker,
    certificateCode,
    filePath
}) => {
    return new Promise((resolve, reject) => {
        try {
            // Create PDF with landscape orientation
            const doc = new PDFDocument({
                layout: 'landscape',
                size: 'A4',
                margins: { top: 0, bottom: 0, left: 0, right: 0 }
            });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            const width = doc.page.width;
            const height = doc.page.height;

            // ============================================
            // BACKGROUND & BORDER
            // ============================================

            // Background color
            doc.rect(0, 0, width, height).fill('#FFFEF7');

            // Outer border
            doc.lineWidth(3)
               .rect(20, 20, width - 40, height - 40)
               .stroke('#1a5276');

            // Inner border
            doc.lineWidth(1)
               .rect(30, 30, width - 60, height - 60)
               .stroke('#2980b9');

            // Decorative corners
            const cornerSize = 40;
            const corners = [
                [35, 35],
                [width - 35 - cornerSize, 35],
                [35, height - 35 - cornerSize],
                [width - 35 - cornerSize, height - 35 - cornerSize]
            ];

            corners.forEach(([x, y]) => {
                doc.lineWidth(2)
                   .rect(x, y, cornerSize, cornerSize)
                   .stroke('#d4ac0d');
            });

            // ============================================
            // HEADER - Decorative line
            // ============================================
            doc.moveTo(100, 80)
               .lineTo(width - 100, 80)
               .lineWidth(2)
               .stroke('#d4ac0d');

            // ============================================
            // CERTIFICATE TEXT
            // ============================================

            // "CERTIFICATE" title
            doc.font('Helvetica-Bold')
               .fontSize(42)
               .fillColor('#1a5276')
               .text('CERTIFICATE', 0, 95, {
                   align: 'center',
                   width: width
               });

            // "OF PARTICIPATION" subtitle
            doc.font('Helvetica')
               .fontSize(18)
               .fillColor('#2c3e50')
               .text('OF PARTICIPATION', 0, 145, {
                   align: 'center',
                   width: width
               });

            // Decorative line under subtitle
            doc.moveTo(250, 175)
               .lineTo(width - 250, 175)
               .lineWidth(1)
               .stroke('#d4ac0d');

            // "This is to certify that"
            doc.font('Helvetica')
               .fontSize(14)
               .fillColor('#555555')
               .text('This is to certify that', 0, 195, {
                   align: 'center',
                   width: width
               });

            // Student Name
            doc.font('Helvetica-Bold')
               .fontSize(32)
               .fillColor('#1a5276')
               .text(studentName.toUpperCase(), 0, 225, {
                   align: 'center',
                   width: width
               });

            // Underline for name
            const nameWidth = doc.widthOfString(studentName.toUpperCase());
            const nameX = (width - nameWidth) / 2;
            doc.moveTo(nameX, 265)
               .lineTo(nameX + nameWidth, 265)
               .lineWidth(1.5)
               .stroke('#d4ac0d');

            // "has successfully participated in"
            doc.font('Helvetica')
               .fontSize(14)
               .fillColor('#555555')
               .text('has successfully participated in', 0, 280, {
                   align: 'center',
                   width: width
               });

            // Event Title
            doc.font('Helvetica-Bold')
               .fontSize(22)
               .fillColor('#2c3e50')
               .text(`"${eventTitle}"`, 0, 310, {
                   align: 'center',
                   width: width
               });

            // Format date
            const formattedDate = new Date(eventDate).toLocaleDateString(
                'en-US',
                {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }
            );

            // "held on [date]"
            doc.font('Helvetica')
               .fontSize(14)
               .fillColor('#555555')
               .text(`held on ${formattedDate}`, 0, 345, {
                   align: 'center',
                   width: width
               });

            // Organizer info
            if (organizer) {
                doc.font('Helvetica')
                   .fontSize(12)
                   .fillColor('#777777')
                   .text(`Organized by: ${organizer}`, 0, 375, {
                       align: 'center',
                       width: width
                   });
            }

            // ============================================
            // SIGNATURE SECTION
            // ============================================
            const sigY = 430;

            // Left signature (Organizer/Admin)
            doc.moveTo(120, sigY + 30)
               .lineTo(320, sigY + 30)
               .lineWidth(1)
               .stroke('#333333');

            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#333333')
               .text(organizer || 'Event Organizer', 120, sigY + 35, {
                   align: 'center',
                   width: 200
               });

            doc.font('Helvetica')
               .fontSize(10)
               .fillColor('#777777')
               .text('Event Organizer', 120, sigY + 52, {
                   align: 'center',
                   width: 200
               });

            // Right signature (Speaker if available)
            if (speaker) {
                doc.moveTo(width - 320, sigY + 30)
                   .lineTo(width - 120, sigY + 30)
                   .lineWidth(1)
                   .stroke('#333333');

                doc.font('Helvetica-Bold')
                   .fontSize(12)
                   .fillColor('#333333')
                   .text(speaker, width - 320, sigY + 35, {
                       align: 'center',
                       width: 200
                   });

                doc.font('Helvetica')
                   .fontSize(10)
                   .fillColor('#777777')
                   .text('Speaker / Resource Person', width - 320, sigY + 52, {
                       align: 'center',
                       width: 200
                   });
            }

            // ============================================
            // FOOTER - Certificate Code
            // ============================================
            doc.moveTo(100, height - 80)
               .lineTo(width - 100, height - 80)
               .lineWidth(1)
               .stroke('#d4ac0d');

            doc.font('Helvetica')
               .fontSize(9)
               .fillColor('#999999')
               .text(
                   `Certificate Code: ${certificateCode}  |  Verify at: /verify/${certificateCode}`,
                   0,
                   height - 70,
                   {
                       align: 'center',
                       width: width
                   }
               );

            doc.font('Helvetica')
               .fontSize(8)
               .fillColor('#bbbbbb')
               .text(
                   'This is a system-generated certificate. No signature required for digital verification.',
                   0,
                   height - 55,
                   {
                       align: 'center',
                       width: width
                   }
               );

            // ============================================
            // FINALIZE
            // ============================================
            doc.end();

            stream.on('finish', () => {
                resolve(filePath);
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateCertificatePDF };