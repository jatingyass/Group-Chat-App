const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS,
  secretAccessKey: process.env.AWS_SECRET,
  region: process.env.AWS_REGION
});

exports.generatePresignedUrl = (filename, filetype) => {
  const key = `uploads/${Date.now()}_${filename}`;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: filetype,
    Expires: 60
  };

  return new Promise((resolve, reject) => {
    s3.getSignedUrl('putObject', params, (err, url) => {
      if (err) {
        return reject(err);
      }

      const fileUrl = `https://${params.Bucket}.s3.amazonaws.com/${key}`;
      resolve({ url, fileUrl });
    });
  });
};
