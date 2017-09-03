// The code written in BSD/KNF indent style
"use strict";

class Life2DAminos {
	constructor() {
		this.R = 0;
		this.G = 0;
		this.B = 0;
		this.viewRPosition = 0;
		this.viewLPosition = 0;
		this.viewAngle = 0;
		this.viewRange = 0;
	}
}

class Life2DSimulator {
	constructor(windowSystemRoot, rootWindow) {
		this.SysRoot = windowSystemRoot;
		this.rootWindow = rootWindow;
		this.rootWindow.style.overflow = "hidden";
		this.rootWindow.rootInstance = this;
		this.rootWindowStyle = window.getComputedStyle(this.rootWindow);
		this.loopEnded = true;

		this.touchCounter = 0;
		this.touchCounting = false;

		this.startstopButton = null;
		this.lifeNumChanger = null;
		this.lifeNumChangeInvoked = false;

		// Chasing the selected galaxy
		this.chaseLifeInvoked = false;
		this.chaseLifeClickedPos = {x: 0, y: 0};
		this.chasingLife = -1;

		this.timeClock = null;

		this.canvas = null;
		this.context = null;
		this.zScale = 0.05;


		this.dt = 0.1;
		this.fieldSize = 200;
		this.lifeNum = 30;
		this.lifeNumMax = 256;
		this.lifeViewAngleMax = Math.PI;
		this.lifeViewRangeMax = 50;

		this.field = new Array(this.fieldSize * this.fieldSize);
		this.fieldDispPos = new Array(this.fieldSize * this.fieldSize);
		this.lives = new Array(this.lifeNum);
		this.nucleotide = ['a', 'c', 'g', 'u'];
		this.aminos = null;
		this.codons = null;

		this.XYZ_absolute = {
			X: {x: 1.0, y: 0.0, z: 0.0},
			Y: {x: 0.0, y: 1.0, z: 0.0},
			Z: {x: 0.0, y: 0.0, z: 1.0}
		};
		this.displayOffset = {x: 0, y: 0, z: 0};
		this.camera = {
			pos: {x: this.fieldSize / 2, y: this.fieldSize / 2, z: 200.0},
			view: {
				X: {x: 1.0, y: 0.0, z: 0.0},
				Y: {x: 0.0, y: -1.0, z: 0.0},
				Z: {x: 0.0, y: 0.0, z: -1.0}
			},
			F: 30
		};
		this.rotDegree = 3600;
		this.colormapQuantize = 200;
		this.colormap = {current: [], normal: new Array(this.colormapQuantize), bluesea: new Array(this.colormapQuantize)};

		this.prev_mouse = {x: 0, y: 0};
		this.prev_touches = [];

		// Initialize
		this.init();
	}

// ----- Initialize -----
	init()
	{
		// Make colormap
		this.makeColormap();
		this.colormap.current = this.colormap.normal;
		// Initialize canvas
		this.prepareCanvas();
		// Set event listener
		this.rootWindow.addEventListener("keydown", function (e) { e.currentTarget.rootInstance.keyDown(e); }, false);
		this.rootWindow.addEventListener("wheel", function (e) { e.currentTarget.rootInstance.wheelMove(e); }, false);
		// Create UI parts
		this.prepareTools();

		// Set initial field
		this.initField();
		this.initAminos();
		this.initLives();

		// Reset display offset
		this.displayOffset.x = this.canvas.width / 2;
		this.displayOffset.y = this.canvas.height / 2;

		// Start loop
		this.startLoop();
	}

	startLoop()
	{
		let root = this;
		this.timeClock = setInterval(function () { root.loop(); }, 25);
	}

	prepareCanvas()
	{
		// Initialize canvas
		this.canvas = document.createElement("canvas");
		this.canvas.rootInstance = this;
		this.canvas.id = "GalaxySimulatorMainPool";
		this.canvas.style.width = "100%";
		this.canvas.style.height = "100%";
		this.rootWindow.appendChild(this.canvas);
		this.canvas.addEventListener(
		    "windowdrag",
		    function (e) {
			    let style = window.getComputedStyle(e.currentTarget);
			    e.currentTarget.width = parseInt(style.width, 10);
			    e.currentTarget.height = parseInt(style.height, 10);
			    let root = e.currentTarget.rootInstance;
			    root.displayOffset.x = e.currentTarget.width / 2.0;
			    root.displayOffset.y = e.currentTarget.height / 2.0;
		    },
		    false);
		this.canvas.addEventListener("mousedown", function (e) { e.currentTarget.rootInstance.mouseClick(e); }, false);
		this.canvas.addEventListener("mousemove", function (e) { e.currentTarget.rootInstance.mouseMove(e); }, false);
		this.canvas.addEventListener("touchstart", function (e) { e.currentTarget.rootInstance.mouseClick(e); }, false);
		this.canvas.addEventListener("touchmove", function (e) { e.currentTarget.rootInstance.mouseMove(e); }, false);
		this.canvas.addEventListener("dblclick", function (e) { e.currentTarget.rootInstance.mouseDblClick(e); }, false);
		this.canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); }, false);
		this.context = this.canvas.getContext("2d");
		// Initialize canvas size
		let canvasStyle = window.getComputedStyle(this.canvas);
		this.canvas.width = parseInt(canvasStyle.width, 10);
		this.canvas.height = parseInt(canvasStyle.height, 10);
	}

	prepareTools()
	{
		this.startstopButton = document.createElement("div");
		this.startstopButton.rootInstance = this;
		this.startstopButton.innerHTML = "startstop";
		this.startstopButton.id = "Life2DSimulatorStartStopButton";
		this.startstopButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.startstop(e); }, false);
		this.startstopButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.startstop(e); }, false);
		this.rootWindow.appendChild(this.startstopButton);

		let lifeNumChangerLabel = document.createElement("div");
		lifeNumChangerLabel.innerHTML = "life";
		lifeNumChangerLabel.id = "Life2DSimulatorLifeNumChangerLabel";
		lifeNumChangerLabel.className = "Life2DSimulatorInputLabel";
		this.rootWindow.appendChild(lifeNumChangerLabel);
		this.lifeNumChanger = document.createElement("input");
		this.lifeNumChanger.rootInstance = this;
		this.lifeNumChanger.type = "text";
		this.lifeNumChanger.inputmode = "numeric";
		this.lifeNumChanger.value = this.lifeNum;
		this.lifeNumChanger.id = "Life2DSimulatorLifeNumChanger";
		this.lifeNumChanger.className = "Life2DSimulatorInput";
		this.lifeNumChanger.addEventListener("change", function (e) { e.preventDefault(); e.currentTarget.rootInstance.lifeNumChangeInvoked = true; }, false);
		this.rootWindow.appendChild(this.lifeNumChanger);
	}

	initField() {
		for (let N = 0; N < this.field.length; N++) {
			this.field[N] = {
				smell: 0.0,
				level: Math.random() * 5
			    };
		}
	}

	initAminos()
	{
		// Aminos
		this.aminos = new Object();
		this.aminos.ala = new Life2DAminos();
		this.aminos.arg = new Life2DAminos();
		this.aminos.asn = new Life2DAminos();
		this.aminos.asp = new Life2DAminos();
		this.aminos.cys = new Life2DAminos();
		this.aminos.gln = new Life2DAminos();
		this.aminos.glu = new Life2DAminos();
		this.aminos.gly = new Life2DAminos();
		this.aminos.his = new Life2DAminos();
		this.aminos.ile = new Life2DAminos();
		this.aminos.leu = new Life2DAminos();
		this.aminos.lys = new Life2DAminos();
		this.aminos.met = new Life2DAminos();
		this.aminos.phe = new Life2DAminos();
		this.aminos.thr = new Life2DAminos();
		this.aminos.trp = new Life2DAminos();
		this.aminos.tyr = new Life2DAminos();
		this.aminos.val = new Life2DAminos();
		this.aminos.ser = new Life2DAminos();
		this.aminos.pro = new Life2DAminos();
		this.aminos.ala.viewRPosition = 0.02 * Math.PI;
		this.aminos.arg.viewLPosition = 0.02 * Math.PI;
		this.aminos.asn.viewAngle = 0.02 * Math.PI;
		this.aminos.asp.viewRange = 10.0;
		this.aminos.cys.viewRPosition = -0.02 * Math.PI;
		this.aminos.gln.viewLPosition = -0.02 * Math.PI;
		this.aminos.glu.viewAngle = -0.02 * Math.PI;
		this.aminos.gly.viewRange = -3.0;
		this.aminos.his.R = 10;
		this.aminos.ile.G = 10;
		this.aminos.leu.B = 10;
		this.aminos.lys.R = 3;
		this.aminos.met.G = 3;
		this.aminos.phe.B = 3;
		this.aminos.pro.viewAngle = 0.01 * Math.PI;
		this.aminos.ser.viewRange = 5.0;
		this.aminos.thr.viewRPosition = 0.01 * Math.PI;
		this.aminos.trp.viewLPosition = 0.01 * Math.PI;
		this.aminos.tyr.viewAngle = 0.01 * Math.PI;
		this.aminos.val.viewRange = 1.0;
		// Codons
		this.codons = new Object();
		this.codons.gca = {amino: this.aminos.ala, start: false, stop: false};
		this.codons.gcc = {amino: this.aminos.ala, start: false, stop: false};
		this.codons.gcg = {amino: this.aminos.ala, start: false, stop: false};
		this.codons.gcu = {amino: this.aminos.ala, start: false, stop: false};
		this.codons.aga = {amino: this.aminos.arg, start: false, stop: false};
		this.codons.agg = {amino: this.aminos.arg, start: false, stop: false};
		this.codons.cga = {amino: this.aminos.arg, start: false, stop: false};
		this.codons.cgc = {amino: this.aminos.arg, start: false, stop: false};
		this.codons.cgg = {amino: this.aminos.arg, start: false, stop: false};
		this.codons.cgu = {amino: this.aminos.arg, start: false, stop: false};
		this.codons.aac = {amino: this.aminos.asn, start: false, stop: false};
		this.codons.aau = {amino: this.aminos.asn, start: false, stop: false};
		this.codons.gac = {amino: this.aminos.asp, start: false, stop: false};
		this.codons.gau = {amino: this.aminos.asp, start: false, stop: false};
		this.codons.ugc = {amino: this.aminos.cys, start: false, stop: false};
		this.codons.ugu = {amino: this.aminos.cys, start: false, stop: false};
		this.codons.caa = {amino: this.aminos.gln, start: false, stop: false};
		this.codons.cag = {amino: this.aminos.gln, start: false, stop: false};
		this.codons.gaa = {amino: this.aminos.glu, start: false, stop: false};
		this.codons.gag = {amino: this.aminos.glu, start: false, stop: false};
		this.codons.gga = {amino: this.aminos.gly, start: false, stop: false};
		this.codons.ggc = {amino: this.aminos.gly, start: false, stop: false};
		this.codons.ggg = {amino: this.aminos.gly, start: false, stop: false};
		this.codons.ggu = {amino: this.aminos.gly, start: false, stop: false};
		this.codons.cac = {amino: this.aminos.his, start: false, stop: false};
		this.codons.cau = {amino: this.aminos.his, start: false, stop: false};
		this.codons.aua = {amino: this.aminos.ile, start: true, stop: false};
		this.codons.auc = {amino: this.aminos.ile, start: false, stop: false};
		this.codons.auu = {amino: this.aminos.ile, start: false, stop: false};
		this.codons.cua = {amino: this.aminos.leu, start: false, stop: false};
		this.codons.cuc = {amino: this.aminos.leu, start: false, stop: false};
		this.codons.cug = {amino: this.aminos.leu, start: false, stop: false};
		this.codons.cuu = {amino: this.aminos.leu, start: false, stop: false};
		this.codons.uua = {amino: this.aminos.leu, start: false, stop: false};
		this.codons.uug = {amino: this.aminos.leu, start: false, stop: false};
		this.codons.aaa = {amino: this.aminos.lys, start: false, stop: false};
		this.codons.aag = {amino: this.aminos.lys, start: false, stop: false};
		this.codons.aug = {amino: this.aminos.met, start: true, stop: false};
		this.codons.uuc = {amino: this.aminos.phe, start: false, stop: false};
		this.codons.uuu = {amino: this.aminos.phe, start: false, stop: false};
		this.codons.cca = {amino: this.aminos.pro, start: false, stop: false};
		this.codons.ccc = {amino: this.aminos.pro, start: false, stop: false};
		this.codons.ccg = {amino: this.aminos.pro, start: false, stop: false};
		this.codons.ccu = {amino: this.aminos.pro, start: false, stop: false};
		this.codons.agc = {amino: this.aminos.ser, start: false, stop: false};
		this.codons.agu = {amino: this.aminos.ser, start: false, stop: false};
		this.codons.uca = {amino: this.aminos.ser, start: false, stop: false};
		this.codons.ucc = {amino: this.aminos.ser, start: false, stop: false};
		this.codons.ucg = {amino: this.aminos.ser, start: false, stop: false};
		this.codons.ucu = {amino: this.aminos.ser, start: false, stop: false};
		this.codons.aca = {amino: this.aminos.thr, start: false, stop: false};
		this.codons.acc = {amino: this.aminos.thr, start: false, stop: false};
		this.codons.acg = {amino: this.aminos.thr, start: false, stop: false};
		this.codons.acu = {amino: this.aminos.thr, start: false, stop: false};
		this.codons.ugg = {amino: this.aminos.trp, start: false, stop: false};
		this.codons.uac = {amino: this.aminos.tyr, start: false, stop: false};
		this.codons.uau = {amino: this.aminos.tyr, start: false, stop: false};
		this.codons.gua = {amino: this.aminos.val, start: false, stop: false};
		this.codons.guc = {amino: this.aminos.val, start: false, stop: false};
		this.codons.gug = {amino: this.aminos.val, start: true, stop: false};
		this.codons.guu = {amino: this.aminos.val, start: false, stop: false};
		this.codons.uaa = {amino: null, start: false, stop: true};
		this.codons.uag = {amino: null, start: false, stop: true};
		this.codons.uga = {amino: null, start: false, stop: true};
	}

	initLives()
	{
		for (let n = 0; n < this.lives.length; n++) {
			let codeLength = Math.ceil(Math.random() * 240);
			let rna = "";
			for (let i = 0; i < codeLength; i++) {
				let tmp = Math.floor(Math.random() * 4.0);
				rna = rna.concat(this.nucleotide[tmp]);
			}
			let protein = this.polymerase(rna);
			this.lives[n] = this.ribosome(protein);
//			this.lives[n] = {
//				position: {x: Math.random() * this.fieldSize, y: Math.random() * this.fieldSize},
//				direction: Math.random() * 2.0 * Math.PI,
//				color: "rgb(" + r + "," + g + "," + b + ")",
//				viewRPosition: Math.random() * 2.0 * Math.PI,
//				viewLPosition: Math.random() * 2.0 * Math.PI,
//				viewAngle: (0.1 + Math.random()) * 0.91 * Math.PI,
//				viewRange: Math.random() * this.lifeViewRangeMax,
//				gene: [],
//				attacked: false
//			};
			let geneLength = Math.random() * 10;
			for (let k = 0; k < geneLength; k++) {
				this.lives[n].gene[n] = Math.floor(10 * Math.random);
			}
		}
	}


	// ----- Start Simulation -----
	loop()
	{
		if (!this.loopEnded) {
			return;
		}
		if (this.LifeNumChangeInvoked) {
			this.LifeNumChangeInvoked = false;
			this.LifeNumChange();
		}
		//this.automation();
		this.physics();
		this.viewModified();
		this.draw();
		this.AI();
		this.loopEnded = true;
	}



	// ----- REALTIME -----
	asin(y)
	{
		if (-1.0 < y && y < 1.0) {
			return Math.asin(y);
		} else if (y > 0) {
			return 0.25 * Math.PI;
		} else {
			return -0.25 * Math.PI;
		}
	}

	automation()
	{
		if (this.chasingBH >= 0) {
			let N = this.chasingBH;
			let d;
			let Distance = this.chaseLifeDistance;
			Distance = this.chasingLifeDistanceCurrent;
			d = this.lives[N].position.x - this.camera.view.Z.x * this.chasingBHDistanceCurrent - this.camera.pos.x;
			this.camera.pos.x += Math.sign(d) * Math.sqrt(Math.abs(d));
			d = this.lives[N].position.y - this.camera.view.Z.y * this.chasingBHDistanceCurrent  - this.camera.pos.y;
			this.camera.pos.y += Math.sign(d) * Math.sqrt(Math.abs(d));
			d = this.lives[N].position.z - this.camera.view.Z.z * this.chasingBHDistanceCurrent  - this.camera.pos.z;
			this.camera.pos.z += Math.sign(d) * Math.sqrt(Math.abs(d));
		}
	}

	physics()
	{
		for (let N = 0; N < this.field.length; N++) {
			this.field[N].smell = this.field[N].smell;
		}
	}

	AI()
	{
		for (let n = 0; n < this.lives.length; n++) {
			this.lives[n].attacked = false;
		}
		for (let n = 0; n < this.lives.length; n++) {
			let dir = this.lives[n].direction;
			let dir_next = 0;
			let v = Math.random() * 0.5;
			this.lives[n].position.x += v * Math.cos(dir);
			this.lives[n].position.y += v * Math.sin(dir);
			if (this.lives[n].position.x < 0) {
				this.lives[n].position.x = 0;
			} else if (this.lives[n].position.x > this.fieldSize) {
				this.lives[n].position.x = this.fieldSize - 1;
			}
			if (this.lives[n].position.y < 0) {
				this.lives[n].position.y = 0;
			} else if (this.lives[n].position.y > this.fieldSize) {
				this.lives[n].position.y = this.fieldSize - 1;
			}
			for (let k = 0; k < this.lives.length; k++) {
				if (n == k) {
					continue;
				}
				let d = {
					x: this.lives[k].position.x - this.lives[n].position.x,
					y: this.lives[k].position.y - this.lives[n].position.y
				}
				let dist = Math.sqrt(d.x * d.x + d.y * d.y);
				let dir_tmp = Math.atan2(d.y, d.x);
				if (dist < this.lives[n].size + this.lives[k].size) {
					this.mutualAction(this.lives[n], this.lives[k]);
				}
				if (dist < this.lives[n].viewRange &&
				    Math.abs(this.circSub(dir_tmp, dir)) < this.lives[n].viewAngle * 0.5) {
					dir_next += Math.sign(this.circSub(dir, dir_tmp)) * Math.random() * 0.3;
				}
			}
			this.lives[n].direction += dir_next + (Math.random() - 0.5) * 0.03 * Math.PI;
			if (this.lives[n].direction < Math.PI) {
				this.lives[n].direction += 2.0 * Math.PI;
			} else if (this.lives[n].direction > Math.PI) {
				this.lives[n].direction -= 2.0 * Math.PI;
			}
		}
	}

	mutualAction(main, target)
	{
		if (main.gene.length == target.gene.length) { // Can make new life
			this.polymerase(main.gene, target.gene);
		}
	}

	crossRNA(gene)
	{
		// Something like real life,
		// RNAs will cross with another one and concatenate them into the one string.
		// 3-length codons make aminos which extend or diminish life's capacity.
		// Pre-determined aminos will produced by ribosome
		// and then the new life will be sentenced whether it will born or die.
	}

	polymerase(gene)
	{
		let s = 0;
		let proteins = [];
		let p = 0;
		while (s < gene.length - 2) {
			let start = false;
			let i = s;
			for (; i < gene.length - 2; i++) {
				let codon = gene.slice(i, i + 3);
				if (this.codons[codon].start) {
					start = true;
					break;
				}
			}
			s = i + 2;
			if (start) {
				proteins[p] = [];
				let n = i;
				for (; n < gene.length - 2; n += 3) {
					let codon = gene.slice(n, n + 3);
					if (this.codons[codon].stop) {
						break;
					}
					proteins[p].push(this.codons[codon].amino);
				}
				s = n + 2;
				p++;
			}
		}
		return proteins;
	}

	ribosome(proteins)
	{
		let life = {
			position: {x: 0, y: 0},
			direction: 0,
			color: null,
			viewRPosition: 0,
			viewLPosition: 0,
			viewAngle: 0,
			viewRange: 0,
			gene: [],
			attacked: false
		};
		let R = 0;
		let G = 0;
		let B = 0;
		for (let i = 0; i < proteins.length; i++) {
			for (let n = 0; n < proteins[i].length; n++) {
				R += proteins[i][n].R;
				G += proteins[i][n].G;
				B += proteins[i][n].B;
				life.viewRPosition += proteins[i][n].viewRPosition;
				life.viewLPosition += proteins[i][n].viewLPosition;
				life.viewAngle += proteins[i][n].viewAngle;
				life.viewRange += proteins[i][n].viewRange;
			}
			life.color = "rgb(" +
			    (R > 255 ? 255 : R) + "," +
			    (G > 255 ? 255 : G) + "," +
			    (B > 255 ? 255 : B) + ")";
			if (life.viewRPosition < -Math.PI) {
				life.viewRPosition = -Math.PI;
			} else if (life.viewRPosition > Math.PI) {
				life.viewRPosition = Math.PI;
			}
			if (life.viewLPosition < -Math.PI) {
				life.viewLPosition = -Math.PI;
			} else if (life.viewLPosition > Math.PI) {
				life.viewLPosition = Math.PI;
			}
			if (life.viewLPosition < 0) {
				life.viewLPosition = 0;
			} else if (life.viewLPosition > this.lifeViewAngleMax) {
				life.viewLPosition = this.lifeViewAngleMax;
			}
			if (life.viewRange < 0) {
				life.viewRange = 0;
			} else if (life.viewRange > this.lifeViewRangeMax) {
				life.viewRange = this.lifeViewRangeMax;
			}
		}
		return life;
	}

	circSub(a, b)
	{
		let d = a - b;
		let d_alt = a - (b + Math.sign(a) * 2.0 * Math.PI);
		if (Math.abs(d) < Math.abs(d_alt)) {
			return d;
		} else {
			return d_alt;
		}
	}

	makeColormap()
	{
		let dc = 255 / (this.colormapQuantize / 2);
		// Make colormap normal
		for (let i = 0; i <= Math.floor(this.colormapQuantize / 2); i++) {
			this.colormap.normal[i] = 'rgb(0,' + Math.min(255, Math.ceil(dc * i)) + ',' + Math.max(0, 255 - Math.ceil(dc * i)) + ')';
		}
		for (let i = Math.floor(this.colormapQuantize / 2); i < this.colormapQuantize; i++) {
			this.colormap.normal[i] = 'rgb(' + Math.min(255, Math.ceil(dc * (i - this.colormapQuantize / 2))) + ',' + Math.max(0, 255 - Math.ceil(dc * (i - this.colormapQuantize / 2))) + ',0)';
		}
		// Make colormap bluesea
		dc = 255 / this.colormapQuantize;
		for (let i = 0; i < this.colormapQuantize; i++) {
			this.colormap.bluesea[i] = 'rgb(' + Math.min(255, Math.ceil(dc / 2 * i)) + ',' + Math.min(255, Math.ceil(dc * i)) + ',255)';
		}
	}

	viewModified()
	{
		let newWindowSize = {x: parseInt(this.rootWindowStyle.width, 10), y: parseInt(this.rootWindowStyle.height, 10)};
		if (this.canvas.width != newWindowSize.x ||
		    this.canvas.height != newWindowSize.y) {
			this.canvas.width = newWindowSize.x;
			this.canvas.height = newWindowSize.y;
			this.displayOffset.x = newWindowSize.x / 2;
			this.displayOffset.y = newWindowSize.y / 2;
		}
	}

	draw()
	{
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.drawField();
		this.drawLives();
		this.drawXYZVector();
	}

	drawField()
	{
		let xy = {x: 0, y: 0, z: 0};
		for (let y = 0; y < this.fieldSize; y++) {
			for (let x = 0; x < this.fieldSize; x++) {
				this.fieldDispPos[this.fieldSize * y + x] = this.calcView(
				    x,
				    y,
				    this.field[this.fieldSize * y + x].level,
				    this.displayOffset,
				    this.camera);
			}
		}
		// Draw field
		this.context.strokeStyle = "rgb(40, 40, 255)";
		for (let y = 0; y < this.fieldSize; y++) {
			this.context.beginPath();
			this.context.moveTo(
			    this.fieldDispPos[this.fieldSize * y].x,
			    this.fieldDispPos[this.fieldSize * y].y);
			for (let x = 1; x < this.fieldSize; x++) {
				this.context.lineTo(
				    this.fieldDispPos[this.fieldSize * y + x].x,
				    this.fieldDispPos[this.fieldSize * y + x].y);
			}
			this.context.stroke();
		}
		for (let x = 0; x < this.fieldSize; x++) {
			this.context.beginPath();
			this.context.moveTo(
			    this.fieldDispPos[x].x,
			    this.fieldDispPos[x].y);
			for (let y = 1; y < this.fieldSize; y++) {
				this.context.lineTo(
				    this.fieldDispPos[this.fieldSize * y + x].x,
				    this.fieldDispPos[this.fieldSize * y + x].y);
			}
			this.context.stroke();
		}
	}

	drawLives()
	{
		for (let n = 0; n < this.lives.length; n++) {
			// Height along with field level
			let h = this.bilinear(this.lives[n].position.x, this.lives[n].position.y);
			// Draw life body
			let xyz = this.calcView(
			    this.lives[n].position.x,
			    this.lives[n].position.y,
			    h,
			    this.displayOffset,
			    this.camera);
			if (xyz.x < 0 || this.canvas.width < xyz.x ||
			    xyz.y < 0 || this.canvas.height < xyz.y ||
			    xyz.z <= 0) {
				continue;
			}
			this.context.fillStyle = this.lives[n].color;
			this.context.beginPath();
			this.context.arc(xyz.x, xyz.y, 1.0 * this.camera.F / (this.zScale * xyz.z), 0, 2 * Math.PI);
			this.context.fill();
			// Draw life's direction
			let dir = this.lives[n].direction;
			let xyz_tmp = this.calcView(
			    this.lives[n].position.x + 10 * Math.cos(dir),
			    this.lives[n].position.y + 10 * Math.sin(dir),
			    h,
			    this.displayOffset,
			    this.camera);
			this.context.strokeStyle = "rgb(255, 0, 0)";
			this.context.beginPath();
			this.context.moveTo(xyz.x, xyz.y);
			this.context.lineTo(xyz_tmp.x, xyz_tmp.y);
			this.context.stroke();
			// Draw life's sight
			let thisone = this;
			let drawSight = function (life, dir, range, origin, drawStartPoint) {
				xyz_tmp = thisone.calcView(
				    origin.x + range * Math.cos(dir),
				    origin.y + range * Math.sin(dir),
				    h,
				    thisone.displayOffset,
				    thisone.camera);
				thisone.context.moveTo(drawStartPoint.x, drawStartPoint.y);
				thisone.context.lineTo(xyz_tmp.x, xyz_tmp.y);
			};
			// right
			this.context.strokeStyle = "rgb(255, 150, 255)";
			dir = this.lives[n].direction + this.lives[n].viewRPosition;
			this.context.beginPath();
			drawSight(this.lives[n], dir, this.lives[n].viewRange, this.lives[n].position, xyz);
			this.context.stroke();
			// right angle
			this.context.setLineDash([2, 4]);
			this.context.beginPath();
			for (let d = -1; d <= 1; d += 0.0625) {
				dir = this.lives[n].direction + this.lives[n].viewRPosition + d * this.lives[n].viewAngle * 0.5;
				drawSight(this.lives[n], dir, this.lives[n].viewRange, this.lives[n].position, xyz);
			}
			this.context.stroke();
			this.context.setLineDash([]);
			// left
			this.context.strokeStyle = "rgb(255, 255, 150)";
			dir = this.lives[n].direction + this.lives[n].viewLPosition;
			this.context.beginPath();
			drawSight(this.lives[n], dir, this.lives[n].viewRange, this.lives[n].position, xyz);
			this.context.stroke();
			// left angle
			this.context.setLineDash([2, 4]);
			this.context.beginPath();
			for (let d = -1; d <= 1; d += 0.0625) {
				dir = this.lives[n].direction + this.lives[n].viewLPosition + d * this.lives[n].viewAngle * 0.5;
				drawSight(this.lives[n], dir, this.lives[n].viewRange, this.lives[n].position, xyz);
			}
			this.context.stroke();
			this.context.setLineDash([]);
		}
	}

	drawXYZVector()
	{
		let offset = {x: 100, y: 60};
		let xy;
		let fieldXYZ = {
			X: {x: 1, y: 0, z: 0},
			Y: {x: 0, y: 1, z: 0},
			Z: {x: 0, y: 0, z: 1}
		};
		// Show XYZ coordinate
		this.context.lineWidth = 2;

		this.context.beginPath();
		this.context.strokeStyle = "red";
		this.context.moveTo(offset.x, offset.y);
		xy = {x: offset.x + 42 * this.camera.view.X.x, y: offset.y + 42 * this.camera.view.X.y};
		this.context.lineTo(xy.x, xy.y);
		xy.x += 7 * this.camera.view.X.x + 7 * this.camera.view.Y.x;
		xy.y += 7 * this.camera.view.X.y + 7 * this.camera.view.Y.y;
		this.context.moveTo(xy.x, xy.y);
		xy.x += -15 * this.camera.view.X.x - 15 * this.camera.view.Y.x;
		xy.y += -15 * this.camera.view.X.y - 15 * this.camera.view.Y.y;
		this.context.lineTo(xy.x, xy.y);
		xy.x += 15 * this.camera.view.X.x;
		xy.y += 15 * this.camera.view.X.y;
		this.context.moveTo(xy.x, xy.y);
		xy.x += -15 * this.camera.view.X.x + 15 * this.camera.view.Y.x;
		xy.y += -15 * this.camera.view.X.y + 15 * this.camera.view.Y.y;
		this.context.lineTo(xy.x, xy.y);
		this.context.stroke();

		this.context.beginPath();
		this.context.strokeStyle = "lime";
		this.context.moveTo(offset.x, offset.y);
		xy = {x: offset.x + 42 * this.camera.view.Y.x, y: offset.y + 42 * this.camera.view.Y.y};
		this.context.lineTo(xy.x, xy.y);
		this.context.lineTo(
		    xy.x + 7 * this.camera.view.Y.x + 7 * this.camera.view.Z.x,
		    xy.y + 7 * this.camera.view.Y.y + 7 * this.camera.view.Z.y);
		this.context.moveTo(xy.x, xy.y);
		this.context.lineTo(
		    xy.x - 7 * this.camera.view.Y.x + 7 * this.camera.view.Z.x,
		    xy.y - 7 * this.camera.view.Y.y + 7 * this.camera.view.Z.y);
		this.context.moveTo(xy.x, xy.y);
		this.context.lineTo(
		    xy.x - 7 * this.camera.view.Z.x,
		    xy.y - 7 * this.camera.view.Z.y);
		this.context.stroke();

		this.context.beginPath();
		this.context.strokeStyle = "blue";
		this.context.moveTo(offset.x, offset.y);
		xy = {x: offset.x + 42 * this.camera.view.Z.x, y: offset.y + 42 * this.camera.view.Z.y};
		this.context.lineTo(xy.x, xy.y);
		xy.x += -7 * this.camera.view.Z.x + 7 * this.camera.view.X.x;
		xy.y += -7 * this.camera.view.Z.y + 7 * this.camera.view.X.y;
		this.context.moveTo(xy.x, xy.y);
		xy.x += 15 * this.camera.view.Z.x;
		xy.y += 15 * this.camera.view.Z.y;
		this.context.lineTo(xy.x, xy.y);
		xy.x += -15 * this.camera.view.Z.x - 15 * this.camera.view.X.x;
		xy.y += -15 * this.camera.view.Z.y - 15 * this.camera.view.X.y;
		this.context.lineTo(xy.x, xy.y);
		xy.x += 15 * this.camera.view.Z.x;
		xy.y += 15 * this.camera.view.Z.y;
		this.context.lineTo(xy.x, xy.y);
		this.context.stroke();
		this.context.lineWidth = 1;
	}

	calcNormalVector(edges)
	{
		let vector = {x: 0, y: 0, z: 0};
		if (edges.length < 3) {
			return vector;
		}
		let a = {
		    x: edges[2].x - edges[1].x,
		    y: edges[2].y - edges[1].y,
		    z: edges[2].z - edges[1].z};
		let b = {
		    x: edges[0].x - edges[1].x,
		    y: edges[0].y - edges[1].y,
		    z: edges[0].z - edges[1].z};
		vector.x = a.y * b.z - a.z * b.y;
		vector.y = a.z * b.x - a.x * b.z;
		vector.z = a.x * b.y - a.y * b.x;
		let norm = this.normVect(vector);
		if (norm > 0.01) {
			vector.x /= norm;
			vector.y /= norm;
			vector.z /= norm;
		}
		return vector;
	}

	mapXYZ2XYZ(x, y, z, XYZ)
	{
		let xy = {x: 0, y: 0};
		xy.x = x * XYZ.X.x + y * XYZ.X.y + z * XYZ.X.z;
		xy.y = x * XYZ.Y.x + y * XYZ.Y.y + z * XYZ.Y.z;
		xy.z = x * XYZ.Z.x + y * XYZ.Z.y + z * XYZ.Z.z;
		return xy;
	}

	calcView(x, y, z, displayOffset, camera)
	{
		let xyz = {x: 0, y: 0, z: 0};
		let X = x - camera.pos.x;
		let Y = y - camera.pos.y;
		let Z = z - camera.pos.z;
		xyz = this.mapXYZ2XYZ(X, Y, Z, camera.view);
		let z_scaled = this.zScale * xyz.z;
		xyz.x *= this.camera.F / Math.max(Number.EPSILON, z_scaled);
		xyz.y *= this.camera.F / Math.max(Number.EPSILON, z_scaled);
		xyz.x += displayOffset.x;
		xyz.y += displayOffset.y;
		xyz.z += displayOffset.z;
		return xyz;
	}

	normVect(xyz)
	{
		return Math.sqrt(xyz.x * xyz.x + xyz.y * xyz.y + xyz.z * xyz.z);
	}

	innerProductXYZ(A, B)
	{
		return A.x * B.x + A.y * B.y + A.z * B.z;
	}

	normalizeVect(xyz)
	{
		let norm = this.normVect(xyz);
		if (norm > 0.1) {
			xyz.x /= norm;
			xyz.y /= norm;
			xyz.z /= norm;
		}
		return xyz;
	}
	
	crossProduct(X, Y)
	{
		let Z = {x: 0, y: 0, z: 0};
		Z.x = X.y * Y.z - X.z * Y.y;
		Z.y = X.z * Y.x - X.x * Y.z;
		Z.z = X.x * Y.y - X.y * Y.x;
		return Z;
	}

	rotate(xyz, y_axis, x_axis_p)
	{
		let ret = {x: 0, y: 0, z: 0};
		ret.x = xyz.x * Math.cos(y_axis) + xyz.z * Math.sin(y_axis);
		ret.z = xyz.z * Math.cos(y_axis) - xyz.x * Math.sin(y_axis);
		ret.y = xyz.y * Math.cos(x_axis_p) - ret.z * Math.sin(x_axis_p);
		ret.z = ret.z * Math.cos(x_axis_p) + xyz.y * Math.sin(x_axis_p);
		return ret;
	}

	// rotate normalized dimension vectors and output rotated vectors with normalizing
	// note: this function do not return any value and modify the first argument
	rotXYZ(XYZ, y_axis, x_axis_p)
	{
		let XYZrotated = {
		    X: null,
		    Y: null,
		    Z: null};
		XYZrotated.X = this.rotate(XYZ.X, y_axis, x_axis_p);
		XYZrotated.Y = this.rotate(XYZ.Y, y_axis, x_axis_p);
		XYZrotated.Z = this.rotate(XYZ.Z, y_axis, x_axis_p);
		// Normalize
		XYZrotated.X = this.normalizeVect(XYZrotated.X);
		XYZrotated.Y = this.normalizeVect(XYZrotated.Y);
		XYZrotated.Z = this.normalizeVect(XYZrotated.Z);
		// Reduce residue of Y
		let a = this.innerProductXYZ(XYZrotated.X, XYZrotated.Y);
		XYZrotated.Y.x -= a * XYZrotated.X.x;
		XYZrotated.Y.y -= a * XYZrotated.X.y;
		XYZrotated.Y.z -= a * XYZrotated.X.z;
		// Reduce residue of Z
		a = this.innerProductXYZ(XYZrotated.X, XYZrotated.Z);
		XYZrotated.Z.x -= a * XYZrotated.X.x;
		XYZrotated.Z.y -= a * XYZrotated.X.y;
		XYZrotated.Z.z -= a * XYZrotated.X.z;
		a = this.innerProductXYZ(XYZrotated.Y, XYZrotated.Z);
		XYZrotated.Z.x -= a * XYZrotated.Y.x;
		XYZrotated.Z.y -= a * XYZrotated.Y.y;
		XYZrotated.Z.z -= a * XYZrotated.Y.z;
		return XYZrotated;
	}

	rotateXYZ(XYZ, y_axis, x_axis_p, z_axis_pp = 0)
	{
		let RET = {
		    X: {x: 0, y: 0, z: 0},
		    Y: {x: 0, y: 0, z: 0},
		    Z: {x: 0, y: 0, z: 0}};
		RET.X.x = XYZ.X.x * Math.cos(y_axis) + XYZ.Z.x * Math.sin(y_axis);
		RET.X.y = XYZ.X.y * Math.cos(y_axis) + XYZ.Z.y * Math.sin(y_axis);
		RET.X.z = XYZ.X.z * Math.cos(y_axis) + XYZ.Z.z * Math.sin(y_axis);
		RET.Z.x = XYZ.Z.x * Math.cos(y_axis) - XYZ.X.x * Math.sin(y_axis);
		RET.Z.y = XYZ.Z.y * Math.cos(y_axis) - XYZ.X.y * Math.sin(y_axis);
		RET.Z.z = XYZ.Z.z * Math.cos(y_axis) - XYZ.X.z * Math.sin(y_axis);
		RET.Y.x = XYZ.Y.x * Math.cos(x_axis_p) - RET.Z.x * Math.sin(x_axis_p);
		RET.Y.y = XYZ.Y.y * Math.cos(x_axis_p) - RET.Z.y * Math.sin(x_axis_p);
		RET.Y.z = XYZ.Y.z * Math.cos(x_axis_p) - RET.Z.z * Math.sin(x_axis_p);
		RET.Z.x = RET.Z.x * Math.cos(x_axis_p) + XYZ.Y.x * Math.sin(x_axis_p);
		RET.Z.y = RET.Z.y * Math.cos(x_axis_p) + XYZ.Y.y * Math.sin(x_axis_p);
		RET.Z.z = RET.Z.z * Math.cos(x_axis_p) + XYZ.Y.z * Math.sin(x_axis_p);
		if (z_axis_pp != 0) {
			let TMP = {
			    X: {x: RET.X.x, y: RET.X.y, z: RET.X.z},
			    Y: {x: RET.Y.x, y: RET.Y.y, z: RET.Y.z}};
			RET.X.x = TMP.X.x * Math.cos(z_axis_pp) - TMP.Y.x * Math.sin(z_axis_pp);
			RET.X.y = TMP.X.y * Math.cos(z_axis_pp) - TMP.Y.y * Math.sin(z_axis_pp);
			RET.X.z = TMP.X.z * Math.cos(z_axis_pp) - TMP.Y.z * Math.sin(z_axis_pp);
			RET.Y.x = TMP.Y.x * Math.cos(z_axis_pp) + TMP.X.x * Math.sin(z_axis_pp);
			RET.Y.y = TMP.Y.y * Math.cos(z_axis_pp) + TMP.X.y * Math.sin(z_axis_pp);
			RET.Y.z = TMP.Y.z * Math.cos(z_axis_pp) + TMP.X.z * Math.sin(z_axis_pp);
		}
		return RET;
	}

	// rotate normalized dimension vectors and output rotated vectors with normalizing
	// note: this function do not return any value and modify the first argument
	rotCamera(y_axis, x_axis_p, z_axis_pp = 0)
	{
		let XYZrotated = {
		    X: null,
		    Y: null,
		    Z: null};
		XYZrotated = this.rotateXYZ(this.camera.view, y_axis, x_axis_p, z_axis_pp);
		// Normalize
		XYZrotated.X = this.normalizeVect(XYZrotated.X);
		XYZrotated.Y = this.normalizeVect(XYZrotated.Y);
		XYZrotated.Z = this.normalizeVect(XYZrotated.Z);
		// Reduce residue of Y
		let a = this.innerProductXYZ(XYZrotated.X, XYZrotated.Y);
		XYZrotated.Y.x -= a * XYZrotated.X.x;
		XYZrotated.Y.y -= a * XYZrotated.X.y;
		XYZrotated.Y.z -= a * XYZrotated.X.z;
		// Reduce residue of Z
		a = this.innerProductXYZ(XYZrotated.X, XYZrotated.Z);
		XYZrotated.Z.x -= a * XYZrotated.X.x;
		XYZrotated.Z.y -= a * XYZrotated.X.y;
		XYZrotated.Z.z -= a * XYZrotated.X.z;
		a = this.innerProductXYZ(XYZrotated.Y, XYZrotated.Z);
		XYZrotated.Z.x -= a * XYZrotated.Y.x;
		XYZrotated.Z.y -= a * XYZrotated.Y.y;
		XYZrotated.Z.z -= a * XYZrotated.Y.z;
		// Return
		this.camera.view = XYZrotated;
	}

	moveCamera(x, y, z)
	{
		this.camera.pos.x +=
		    x * this.camera.view.X.x +
		    y * this.camera.view.Y.x +
		    z * this.camera.view.Z.x;
		this.camera.pos.y +=
		    x * this.camera.view.X.y +
		    y * this.camera.view.Y.y +
		    z * this.camera.view.Z.y;
		this.camera.pos.z +=
		    x * this.camera.view.X.z +
		    y * this.camera.view.Y.z +
		    z * this.camera.view.Z.z;

		this.chasingBHDistanceCurrent -= z;
		if (this.chasingBHDistanceCurrent <= this.camera.F) {
			this.chasingBHDistanceCurrent = this.camera.F + 1;
		}
	}

	rotate3d(XYZ, rolling)
	{
		let di_r = {x: 0, y: 0, z: 0};
		let di_p = {x: 0, y: 0, z: 0};
		let di_y = {x: 0, y: 0, z: 0};
		let di_py = {x: 0, y: 0, z: 0};
		let di = {x: 0, y: 0, z: 0};
		// Yaw
		di_y.x =
		    XYZ.x * Math.cos(rolling.yaw) -
		    XYZ.y * Math.sin(rolling.yaw) -
		    XYZ.x;
		di_y.y =
		    XYZ.y * Math.cos(rolling.yaw) +
		    XYZ.x * Math.sin(rolling.yaw) -
		    XYZ.y;
		// Pitch
		di_p.x =
		    XYZ.x * Math.cos(rolling.pitch) +
		    XYZ.z * Math.sin(rolling.pitch) -
		    XYZ.x;
		di_p.z =
		    XYZ.z * Math.cos(rolling.pitch) -
		    XYZ.x * Math.sin(rolling.pitch) -
		    XYZ.z;
		di_py.x = di_p.x + di_y.x * Math.cos(rolling.pitch);
		di_py.y = di_y.y;
		di_py.z = di_p.z - di_y.x * Math.sin(rolling.pitch);
		// Roll
		di_r.y =
		    XYZ.y * Math.cos(rolling.roll) -
		    XYZ.z * Math.sin(rolling.roll) -
		    XYZ.y;
		di_r.z =
		    XYZ.z * Math.cos(rolling.roll) +
		    XYZ.y * Math.sin(rolling.roll) -
		    XYZ.z;
		di.x = di_py.x;
		di.y =
		    di_r.y +
		    di_py.y * Math.cos(rolling.roll) -
		    di_py.z * Math.sin(rolling.roll);
		di.z =
		    di_r.z +
		    di_py.z * Math.cos(rolling.roll) +
		    di_py.y * Math.sin(rolling.roll);
		return {x: XYZ.x + di.x, y: XYZ.y + di.y, z: XYZ.z + di.z};
	}

	mouseClick(event)
	{
		event.preventDefault();
		let root = this;
		if (event.type === "mousedown") {
			this.prev_mouse = {clientX: event.clientX, clientY: event.clientY};
		} else if (event.type === "touchstart") {
			let touches_current = Array.from(event.touches);
			this.prev_touches = touches_current.map(this.extractTouches);
			if (this.touchCounting && event.touches.length == 1) {
				this.touchDblTap(event);
			}
			if (event.touches.length == 1) {
				// Set touchCounting should be at end of event processing
				this.touchCounting = true;
				clearTimeout(this.touchCounter);
				this.touchCounter = setTimeout(function () { root.touchCounting = false; }, 200);
			}
		}
	}

	mouseMove(event)
	{
		event.preventDefault();
		if (event.type === "mousemove") {
			let move = {x: 0, y: 0};
			move.x = event.clientX - this.prev_mouse.clientX;
			move.y = event.clientY - this.prev_mouse.clientY;
			if ((event.buttons & 1) != 0) {
				this.rotCamera(
				    -2.0 * Math.PI * move.x / this.rotDegree,
				    2.0 * Math.PI * move.y / this.rotDegree);
			} else if ((event.buttons & 2) != 0) {
				this.rotCamera(0, 0, -2.0 * Math.PI * move.x / this.rotDegree);
			} else if ((event.buttons & 4) != 0) {
				this.moveCamera(move.x, move.y, 0);
			}
			this.prev_mouse = {clientX: event.clientX, clientY: event.clientY};
		} else if (event.type === "touchmove") {
			let touches_current = Array.from(event.touches);
			let move = {x: 0, y: 0};
			if (touches_current.length == 1) {
				let n = this.prev_touches.findIndex(function (element, index, touches) {
					if (element.identifier == this[0].identifier) {
						return true;
					} else {
						return false;
					}
				    },
				    touches_current);
				if (n >= 0) {
					move.x = touches_current[0].clientX - this.prev_touches[n].clientX;
					move.y = touches_current[0].clientY - this.prev_touches[n].clientY;
					this.rotCamera(
					    -2.0 * Math.PI * move.x / this.rotDegree,
					    2.0 * Math.PI * move.y / this.rotDegree);
				}
			} else if (touches_current.length == 2 && this.prev_touches.length == 2) {
				let p0 = {x: this.prev_touches[0].clientX, y: this.prev_touches[0].clientY};
				let p1 = {x: this.prev_touches[1].clientX, y: this.prev_touches[1].clientY};
				let r0 = {x: touches_current[0].clientX, y: touches_current[0].clientY};
				let r1 = {x: touches_current[1].clientX, y: touches_current[1].clientY};
				move.x = ((r0.x + r1.x) - (p0.x + p1.x)) * 0.5;
				move.y = ((r0.y + r1.y) - (p0.y + p1.y)) * 0.5;
				let dp = Math.sqrt(Math.pow(p0.x - p1.x, 2) + Math.pow(p0.y - p1.y, 2));
				let d = Math.sqrt(Math.pow(r0.x - r1.x, 2) + Math.pow(r0.y - r1.y, 2));
				this.moveCamera(move.x, move.y, 0.25 * (d - dp));
			}
			this.prev_touches = touches_current.map(this.extractTouches);
		}
	}

	extractTouches(a)
	{
		return {clientX: a.clientX, clientY: a.clientY, identifier: a.identifier};
	}

	wheelMove(event)
	{
		event.preventDefault();
		this.moveCamera(0, 0, -event.deltaY * 0.1);
	}

	mouseDblClick(event)
	{
		event.preventDefault();
		this.chaseBHInvoked = true;
		this.chasingBHDistanceCurrent = this.chaseBHDistance;
		this.chaseBHClickedPos = {x: event.clientX, y: event.clientY};
	}

	touchDblTap(event)
	{
		this.chaseBHInvoked = true;
		this.chasingBHDistanceCurrent = this.chaseBHDistance;
		this.chaseBHClickedPos = {x: event.touches[0].clientX, y: event.touches[0].clientY};
	}

	keyDown(event)
	{
		switch (event.key) {
			case "ArrowUp":
				break;
			case "ArrowDown":
				break;
			case "ArrowLeft":
				break;
			case "ArrowRight":
				break;
		}
	}

	startstop()
	{
		if (this.timeClock) {
			clearInterval(this.timeClock);
			this.timeClock = null;
		} else {
			this.startLoop();
		}
	}

	particleNumChange()
	{
		let val = this.particleNumChanger.value;
		if (val < 0) {
			val = 0;
		}
		let increase = false;
		if (val > this.particleNum) {
			increase = true;
		}
		this.particleNum = val;
		if (increase) {
			this.initGalaxy();
		}
	}

	bilinear(x, y)
	{
		if (x < 0) {
			x = 0;
		} else if (x >= this.fieldSize - 1) {
			x = this.fieldSize - 1;
		}
		if (y < 0) {
			y = 0;
		} else if (y >= this.fieldSize - 1) {
			y = this.fieldSize - 1;
		}
		let x_f = Math.floor(x);
		let y_f = Math.floor(y);
		if (x_f >= this.fieldSize - 1) {
			x_f = this.fieldSize - 2;
		}
		if (y_f >= this.fieldSize - 1) {
			y_f = this.fieldSize - 2;
		}
		let f0 = this.field[this.fieldSize * y_f + x_f].level;
		let f1 = this.field[this.fieldSize * y_f + (x_f + 1)].level;
		let f2 = this.field[this.fieldSize * (y_f + 1) + x_f].level;
		let f3 = this.field[this.fieldSize * (y_f + 1) + (x_f + 1)].level;
		return (f0 + (f1 - f0) * (x - x_f)) * (1 - y + y_f) +
		    (f2 + (f3 - f2) * (x - x_f)) * (y - y_f);
	}
}

