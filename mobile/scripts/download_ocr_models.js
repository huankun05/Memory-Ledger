const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS_DIR = path.join(__dirname, '../android/app/src/main/assets/models');
const MODELS = [
  {
    name: 'ch_PP-OCRv4_det_infer.onnx',
    url: 'https://paddleocr.bj.bcebos.com/PP-OCRv4/chinese/ch_PP-OCRv4_det_infer.onnx',
  },
  {
    name: 'ch_PP-OCRv4_rec_infer.onnx',
    url: 'https://paddleocr.bj.bcebos.com/PP-OCRv4/chinese/ch_PP-OCRv4_rec_infer.onnx',
  },
  {
    name: 'ppocr_keys_v1.txt',
    url: 'https://paddleocr.bj.bcebos.com/dygraph_v2.0/ch/ch_ppocr_mobile_v2.0_rec_prepostprocess.zip',
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log('Downloading OCR models...');
  
  for (const model of MODELS) {
    const dest = path.join(MODELS_DIR, model.name);
    if (fs.existsSync(dest)) {
      console.log(`✓ ${model.name} already exists`);
      continue;
    }
    console.log(`Downloading ${model.name}...`);
    try {
      await downloadFile(model.url, dest);
      console.log(`✓ ${model.name} downloaded successfully`);
    } catch (err) {
      console.error(`✗ Failed to download ${model.name}: ${err.message}`);
    }
  }
  
  console.log('\nAll OCR models downloaded!');
}

main().catch(console.error);