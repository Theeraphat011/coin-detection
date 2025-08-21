const modeSelect = document.getElementById("mode");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const coinNameBox = document.getElementById("coinName");
const summaryBox = document.getElementById("summary");
const fileInput = document.getElementById("fileInput");
const previewImg = document.getElementById("preview");
const selectBtn = document.getElementById("selectImage");
const processBtn = document.getElementById("processImage");
const PREDICT_URL = process.env.PREDICT_URL;

let selectedFile = null;
let realtimeInterval;
let stream;

function setLoading(on) {
	function setBtnLoading(btn, label) {
		if (!btn) return;
		if (on) {
			if (typeof btn.dataset.orig === "undefined") btn.dataset.orig = btn.innerHTML;
			btn.disabled = true;
			btn.classList.add("btn-spinner");
			btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px"><div class=\"spinner\"></div><span>${label}</span></span>`;
		} else {
			btn.disabled = false;
			btn.classList.remove("btn-spinner");
			if (typeof btn.dataset.orig !== "undefined") {
				btn.innerHTML = btn.dataset.orig;
				delete btn.dataset.orig;
			}
		}
	}

	stopBtn.disabled = on;
	selectBtn.disabled = on;
	if (processBtn && processBtn.style.display !== "none")
		setBtnLoading(processBtn, "กำลังประมวลผล...");
	if (startBtn && startBtn.style.display !== "none") setBtnLoading(startBtn, "กำลังทำงาน...");
}

function updateUIForMode() {
	const mode = modeSelect.value;
	if (mode === "single") {
		video.style.display = "none";
		canvas.style.display = "none";
		previewImg.style.display = "block";
		selectBtn.style.display = "inline-block";
		processBtn.style.display = "inline-block";
		processBtn.disabled = !selectedFile;
	} else {
		video.style.display = "block";
		canvas.style.display = "none";
		previewImg.style.display = "none";
		selectBtn.style.display = "none";
		processBtn.style.display = "none";
	}
}

startBtn.onclick = async () => {
	const mode = modeSelect.value;
	if (mode === "single") {
		updateUIForMode();
	} else if (mode === "realtime") {
		updateUIForMode();
		await startRealtime();
	}
};

modeSelect.onchange = () => {
	selectedFile = null;
	updateUIForMode();
};

stopBtn.onclick = () => {
	if (realtimeInterval) {
		clearInterval(realtimeInterval);
		realtimeInterval = null;
	}
	if (stream) {
		try {
			stream.getTracks().forEach((track) => track.stop());
		} catch (e) {}
		stream = null;
	}

	video.style.display = "none";
	video.srcObject = null;
	canvas.style.display = "none";
	try {
		const ctx = canvas.getContext("2d");
		ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
	} catch (e) {}

	previewImg.style.display = "none";
	previewImg.src = "";

	selectedFile = null;
	try {
		fileInput.value = null;
	} catch (e) {}

	coinNameBox.textContent = "ยังไม่ได้ตรวจจับ";
	summaryBox.textContent = "";
	selectBtn.style.display = "none";
	processBtn.style.display = "none";
	processBtn.disabled = true;

	try {
		modeSelect.value = "single";
	} catch (e) {}
	updateUIForMode();
};

function startSingle() {
	fileInput.click();
}

fileInput.onchange = (e) => {
	const file = e.target.files[0];
	if (!file) return;
	selectedFile = file;
	try {
		const url = URL.createObjectURL(file);
		previewImg.src = url;
		previewImg.onload = () => {
			URL.revokeObjectURL(url);
		};
		previewImg.style.display = "block";
	} catch (e) {}
	processBtn.disabled = false;
	updateUIForMode();
};

selectBtn.onclick = () => {
	fileInput.click();
};
processBtn.onclick = async () => {
	if (!selectedFile) {
		alert("กรุณาเลือกภาพก่อนประมวลผล");
		return;
	}
	await sendFile(selectedFile);
};

async function startRealtime() {
	if (realtimeInterval) clearInterval(realtimeInterval);
	try {
		stream = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: "environment" },
		});
		video.srcObject = stream;
		realtimeInterval = setInterval(() => captureFrame(), 3000);
	} catch (err) {
		alert("ไม่สามารถเข้าถึงกล้อง: " + err);
	}
}

function captureFrame() {
	if (!video.videoWidth) return;
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	canvas.getContext("2d").drawImage(video, 0, 0);
	canvas.toBlob(async (blob) => {
		await sendFile(blob);
	}, "image/jpeg");
}

async function sendFile(file) {
	setLoading(true);
	const formData = new FormData();
	formData.append("file", file, "frame.jpg");
	try {
		const res = await fetch(PREDICT_URL, { method: "POST", body: formData });
		let data;
		try {
			data = await res.json();
		} catch (e) {
			const txt = await res.text();
			try {
				data = JSON.parse(txt);
			} catch (e2) {
				data = txt;
			}
		}

		console.log(data);
		function extractPredictions(obj) {
			if (!obj) return [];
			if (Array.isArray(obj)) return obj;
			if (typeof obj === "string") {
				try {
					return extractPredictions(JSON.parse(obj));
				} catch (e) {
					return [];
				}
			}
			const candidateKeys = ["predictions", "results", "detections", "data", "items"];
			for (const k of candidateKeys) if (Array.isArray(obj[k])) return obj[k];
			for (const k in obj) {
				if (Array.isArray(obj[k]) && obj[k].length > 0 && typeof obj[k][0] === "object") {
					const sample = obj[k][0];
					if (sample.name || sample.class || sample.confidence || sample.box)
						return obj[k];
				}
			}
			return [];
		}

		const predictions = extractPredictions(data);
		if (predictions.length > 0) {
			const counts = predictions.reduce((acc, p) => {
				const n =
					p && p.name
						? p.name
						: p && typeof p.class !== "undefined"
						? `class ${p.class}`
						: "unknown";
				acc[n] = (acc[n] || 0) + 1;
				return acc;
			}, {});
			const total = predictions.length;
			const parts = Object.keys(counts).map((k) => `${k} = ${counts[k]}`);

			// estimate total money value (THB)
			const valueMap = {
				"coin 1 baht": 1,
				"coin 5 baht": 5,
				"coin 10 baht": 10,
			};

			let totalValue = 0;
			for (const name of Object.keys(counts)) {
				const cnt = counts[name];
				let v = valueMap[name];
				if (typeof v === "undefined") {
					const m = String(name).match(/(\d+(?:\.\d+)?)/);
					v = m ? parseFloat(m[1]) : 0;
				}
				totalValue += (v || 0) * cnt;
			}

			summaryBox.textContent = `สรุป: รวม ${total} เหรียญ (${parts.join(
				" | ",
			)}) — รวมเงิน ${totalValue.toFixed(2)} บาท`;
			const best = predictions.reduce((a, b) =>
				(a.confidence || 0) > (b.confidence || 0) ? a : b,
			);
			const coinName =
				best && best.name
					? best.name
					: best && typeof best.class !== "undefined"
					? `class ${best.class}`
					: "";
			coinNameBox.textContent = `🪙 เหรียญที่แม่นยำที่สุด: ${coinName} (ความแม่นยำ ${(
				best.confidence * 100
			).toFixed(1)}%)`;
		} else {
			coinNameBox.textContent = "❌ ไม่เจอเหรียญในภาพ";
			summaryBox.textContent = "";
		}
	} catch (err) {
		console.error(err);
		coinNameBox.textContent = "Error: " + err;
	} finally {
		setLoading(false);
	}
}
