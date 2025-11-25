const { bucket } = require('../config/firebase');
const path = require('path');

class fileuploadservices {
  static async uploadFile(file, destinationPath) {
    try {
      const blob = bucket.file(destinationPath);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      return new Promise((resolve, reject) => {
        blobStream.on('error', (error) => {
          reject(error);
        });

        blobStream.on('finish', async () => {
          // Make the file public
          await blob.makePublic();
          
          // Get public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          resolve(publicUrl);
        });

        blobStream.end(file.buffer);
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  static async deleteFile(fileUrl) {
    try {
      const fileName = fileUrl.split('/').pop();
      await bucket.file(fileName).delete();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  static async uploadTranscript(file, studentId) {
    const fileName = `transcripts/${studentId}/${Date.now()}_${file.originalname}`;
    return await this.uploadFile(file, fileName);
  }

  static async uploadCertificate(file, studentId) {
    const fileName = `certificates/${studentId}/${Date.now()}_${file.originalname}`;
    return await this.uploadFile(file, fileName);
  }

  static async uploadProfileImage(file, userId) {
    const fileName = `profiles/${userId}/${Date.now()}_${file.originalname}`;
    return await this.uploadFile(file, fileName);
  }

  static validateFile(file, allowedTypes, maxSize) {
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    return true;
  }
}

module.exports = fileuploadservices;