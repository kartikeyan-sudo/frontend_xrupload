// Set API_BASE to your Railway backend URL for Netlify deployment
const API_BASE = window.location.hostname.includes('netlify.app')
  ? 'https://your-railway-app.up.railway.app'
  : 'http://localhost:8000';

const drop = document.getElementById('droparea');
const fileInput = document.getElementById('fileInput');
const fileMeta = document.getElementById('fileMeta');
const thumb = document.getElementById('thumb');
const fname = document.getElementById('fname');
const fsize = document.getElementById('fsize');
const uploadBtn = document.getElementById('uploadBtn');
const progressArea = document.getElementById('progressArea');
const uploadProgress = document.getElementById('uploadProgress');
const statusText = document.getElementById('statusText');
const resultArea = document.getElementById('resultArea');
const resultVideo = document.getElementById('resultVideo');
const resultLink = document.getElementById('resultLink');
const copyBtn = document.getElementById('copyBtn');
const cloudFolderInput = document.getElementById('cloudFolder');

const MAX_MB = 200;
let selectedFile = null;

// restore folder from localStorage
cloudFolderInput.value = localStorage.getItem('xrcc_folder') || 'xrcc';
cloudFolderInput.addEventListener('change', ()=>{
  localStorage.setItem('xrcc_folder', cloudFolderInput.value);
});

drop.addEventListener('click', ()=>fileInput.click());
drop.addEventListener('dragover', ev=>{ev.preventDefault();drop.classList.add('drag');});
drop.addEventListener('dragleave', ev=>{ev.preventDefault();drop.classList.remove('drag');});
drop.addEventListener('drop', ev=>{ev.preventDefault();drop.classList.remove('drag');const f=ev.dataTransfer.files[0];onFileSelected(f)});
fileInput.addEventListener('change', e=>onFileSelected(e.target.files[0]));

function onFileSelected(file){
  if(!file) return;
  if(file.size > MAX_MB * 1024 * 1024){alert('File too large');return}
  selectedFile = file;
  fname.textContent = file.name;
  fsize.textContent = `${(file.size/1024/1024).toFixed(2)} MB`;
  fileMeta.classList.remove('hidden');
  // generate thumb
  const url = URL.createObjectURL(file);
  thumb.src = url;
  uploadBtn.disabled = false;
}

uploadBtn.addEventListener('click', ()=>{
  if(!selectedFile) return;
  upload(selectedFile);
});

function upload(file){
  progressArea.classList.remove('hidden');
  statusText.textContent = 'Uploading...';
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_BASE}/upload`);
  xhr.upload.onprogress = function(e){
    if(e.lengthComputable){
      const p = Math.round(e.loaded / e.total * 100);
      uploadProgress.style.width = p + '%';
    }
  }
  xhr.onreadystatechange = function(){
    if(xhr.readyState === 4){
      if(xhr.status === 202){
        const data = JSON.parse(xhr.responseText);
        statusText.textContent = 'Uploaded. Processing...';
        pollStatus(data.job_id);
      } else {
        statusText.textContent = 'Upload failed';
      }
    }
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', cloudFolderInput.value || 'xrcc');
  xhr.send(fd);
}

function pollStatus(jobId){
  const interval = setInterval(async ()=>{
    try{
      const res = await fetch(`${API_BASE}/status/${jobId}`);
      if(!res.ok){throw new Error('status fetch failed')}
      const j = await res.json();
      statusText.textContent = `${j.status} (${j.progress}%)`;
      uploadProgress.style.width = j.progress + '%';
      if(j.status === 'done'){
        clearInterval(interval);
        showResult(j.result_url);
      }
      if(j.status === 'error'){
        clearInterval(interval);
        statusText.textContent = 'Error: ' + (j.error || j.message);
      }
    }catch(e){
      console.error(e);
    }
  }, 2000);
}

function showResult(url){
  resultArea.classList.remove('hidden');
  resultVideo.src = url;
  resultLink.href = url;
  resultLink.textContent = url;
  statusText.textContent = 'Done';
}

copyBtn.addEventListener('click', ()=>{
  const url = resultLink.href;
  navigator.clipboard.writeText(url);
});
