window.addEventListener("load", initSystem, false);

var SystemRoot;
var Life2DSimulatorWindow;
var Life2DSimulatorApplication;

function
initSystem()
{
	SystemRoot = new ECMASystem(document.body);

	Life2DSimulatorWindow = SystemRoot.createWindow({id: "Life2DSimulator", noCloseButton: null});
	Life2DSimulatorWindow.style.position = "absolute";
	Life2DSimulatorWindow.style.top = "0px";
	Life2DSimulatorWindow.style.left = "0px";
	Life2DSimulatorWindow.style.width = "100%";
	Life2DSimulatorWindow.style.height = "100%";
	Life2DSimulatorWindow.style.padding = "0";
	Life2DSimulatorWindow.style.outline = "0";
	Life2DSimulatorWindow.style.border = "0";
	Life2DSimulatorWindow.style.backgroundColor = "rgba(20, 20, 20, 0.5)";
	document.body.appendChild(Life2DSimulatorWindow);
	SystemRoot.windowScroller.style.display = "none";

	Life2DSimulatorApplication = new Life2DSimulator(SystemRoot, Life2DSimulatorWindow);
}

