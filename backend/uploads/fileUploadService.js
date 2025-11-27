const { bucket } = require('../config/firebase');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { MAX_FILE_SIZES, ALLOWED_MIME_TYPES, FILE_TYPES } = require('../utils/constants');

const unlinkAsync = promisify(fs.unlink);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

class FileUploadService {
  /**
   * Upload file to Firebase Storage
   */
  static async uploadToFirebase(filePath, destinationPath, metadata = {}) {
    try {
      const fileBuffer = await readFileAsync(filePath);
      
      const blob = bucket.file(destinationPath);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: metadata.contentType || 'application/octet-stream',
          metadata: {
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        },
        resumable: false
      });

      return new Promise((resolve, reject) => {
        blobStream.on('error', (error) => {
          reject(new Error(`Firebase upload error: ${error.message}`));
        });

        blobStream.on('finish', async () => {
          try {
            // Make the file public
            await blob.makePublic();
            
            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            
            // Delete local file after successful upload
            await unlinkAsync(filePath);
            
            resolve({
              url: publicUrl,
              path: blob.name,
              size: fileBuffer.length,
              contentType: metadata.contentType
            });
          } catch (error) {
            reject(error);
          }
        });

        blobStream.end(fileBuffer);
      });

    } catch (error) {
      throw new Error(`File upload error: ${error.message}`);
    }
  }

  /**
   * Upload file locally (for development)
   */
  static async uploadLocally(file, destinationPath, keepOriginal = false) {
    try {
      const stats = await statAsync(file.path);
      const fileExtension = path.extname(file.originalname);
      
      const result = {
        url: `/uploads/${destinationPath}`,
        path: destinationPath,
        size: stats.size,
        contentType: file.mimetype,
        originalName: file.originalname,
        filename: path.basename(destinationPath)
      };

      // If not keeping original, the file is already in the correct location
      if (!keepOriginal) {
        return result;
      }

      // If keeping original, we need to copy/move it
      const finalPath = path.join('uploads', destinationPath);
      const finalDir = path.dirname(finalPath);
      
      // Ensure directory exists
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }

      // Copy file to final location
      fs.copyFileSync(file.path, finalPath);
      
      // Remove temporary file
      await unlinkAsync(file.path);

      return result;

    } catch (error) {
      throw new Error(`Local upload error: ${error.message}`);
    }
  }

  /**
   * Upload transcript file
   */
  static async uploadTranscript(file, studentId, uploadToFirebase = false) {
    this.validateFile(file, FILE_TYPES.TRANSCRIPT);

    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const destinationPath = `transcripts/${studentId}/transcript_${timestamp}${fileExtension}`;

    const metadata = {
      studentId,
      type: 'transcript',
      uploadedAt: new Date().toISOString(),
      contentType: file.mimetype
    };

    if (uploadToFirebase) {
      return await this.uploadToFirebase(file.path, destinationPath, metadata);
    } else {
      return await this.uploadLocally(file, destinationPath);
    }
  }

  /**
   * Upload certificate file
   */
  static async uploadCertificate(file, studentId, certificateName = '', uploadToFirebase = false) {
    this.validateFile(file, FILE_TYPES.CERTIFICATE);

    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const safeCertificateName = certificateName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50) || 'certificate';
    
    const destinationPath = `certificates/${studentId}/${safeCertificateName}_${timestamp}${fileExtension}`;

    const metadata = {
      studentId,
      type: 'certificate',
      certificateName,
      uploadedAt: new Date().toISOString(),
      contentType: file.mimetype
    };

    if (uploadToFirebase) {
      return await this.uploadToFirebase(file.path, destinationPath, metadata);
    } else {
      return await this.uploadLocally(file, destinationPath);
    }
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(file, userId, uploadToFirebase = false) {
    this.validateFile(file, FILE_TYPES.PROFILE_IMAGE);

    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const destinationPath = `profiles/${userId}/profile_${timestamp}${fileExtension}`;

    const metadata = {
      userId,
      type: 'profile_image',
      uploadedAt: new Date().toISOString(),
      contentType: file.mimetype
    };

    if (uploadToFirebase) {
      return await this.uploadToFirebase(file.path, destinationPath, metadata);
    } else {
      return await this.uploadLocally(file, destinationPath);
    }
  }

  /**
   * Upload multiple documents
   */
  static async uploadMultipleFiles(files, userId, type = 'documents', uploadToFirebase = false) {
    const uploads = await Promise.all(
      files.map(async (file, index) => {
        try {
          this.validateFile(file, FILE_TYPES.CERTIFICATE); // Use certificate validation for general docs

          const timestamp = Date.now();
          const fileExtension = path.extname(file.originalname);
          const destinationPath = `${type}/${userId}/doc_${timestamp}_${index}${fileExtension}`;

          const metadata = {
            userId,
            type,
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
            contentType: file.mimetype
          };

          if (uploadToFirebase) {
            return await this.uploadToFirebase(file.path, destinationPath, metadata);
          } else {
            return await this.uploadLocally(file, destinationPath);
          }
        } catch (error) {
          console.error(`Error uploading file ${file.originalname}:`, error);
          return {
            error: error.message,
            originalName: file.originalname
          };
        }
      })
    );

    return uploads;
  }

  /**
   * Validate file before upload
   */
  static validateFile(file, fileType) {
    if (!file) {
      throw new Error('No file provided');
    }

    const allowedTypes = ALLOWED_MIME_TYPES[fileType];
    const maxSize = MAX_FILE_SIZES[fileType];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type for ${fileType}. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File size too large for ${fileType}. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    // Additional security checks
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
      // Check for valid JPEG header
      const jpegHeader = file.buffer?.slice(0, 3).toString('hex');
      if (jpegHeader !== 'ffd8ff') {
        throw new Error('Invalid JPEG file');
      }
    }

    if (file.mimetype === 'image/png') {
      // Check for valid PNG header
      const pngHeader = file.buffer?.slice(0, 8).toString('hex');
      if (pngHeader !== '89504e470d0a1a0a') {
        throw new Error('Invalid PNG file');
      }
    }

    return true;
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(fileUrl, isFirebase = false) {
    try {
      if (isFirebase) {
        // Extract file path from Firebase URL
        const filePath = fileUrl.replace(`https://storage.googleapis.com/${bucket.name}/`, '');
        await bucket.file(filePath).delete();
      } else {
        // Extract file path from local URL
        const filePath = fileUrl.replace('/uploads/', '');
        const fullPath = path.join('uploads', filePath);
        await unlinkAsync(fullPath);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get file information
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await statAsync(filePath);
      return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.ctime
      };
    } catch (error) {
      throw new Error(`File not found: ${error.message}`);
    }
  }

  /**
   * Clean up old files
   */
  static async cleanupOldFiles(daysOld = 30, fileType = null) {
    try {
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      const baseDirs = fileType ? [`uploads/${fileType}`] : ['uploads/transcripts', 'uploads/certificates', 'uploads/profiles', 'uploads/temp'];

      let deletedCount = 0;

      for (const baseDir of baseDirs) {
        if (!fs.existsSync(baseDir)) continue;

        const files = await this.walkDirectory(baseDir);
        
        for (const file of files) {
          try {
            const stats = await statAsync(file);
            if (stats.mtimeMs < cutoffTime) {
              await unlinkAsync(file);
              deletedCount++;
              console.log(`Deleted old file: ${file}`);
            }
          } catch (error) {
            console.error(`Error processing file ${file}:`, error);
          }
        }
      }

      return { deletedCount };
    } catch (error) {
      console.error('Error in cleanup:', error);
      throw error;
    }
  }

  /**
   * Recursively walk directory
   */
  static async walkDirectory(dir) {
    const files = [];
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...await this.walkDirectory(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Generate secure download URL (for Firebase)
   */
  static async generateDownloadUrl(filePath, expiresInMinutes = 60) {
    try {
      const file = bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000
      });
      
      return url;
    } catch (error) {
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }
}

module.exports = FileUploadService;