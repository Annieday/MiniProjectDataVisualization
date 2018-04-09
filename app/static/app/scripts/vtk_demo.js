/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */

import 'vtk.js/Sources/favicon';
import JSZip from 'jszip';

import macro from 'vtk.js/Sources/macro';
import HttpDataAccessHelper from 'vtk.js/Sources/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkURLExtract from 'vtk.js/Sources/Common/Core/URLExtract';
import vtkCubeSource from 'vtk.js/Sources/Filters/Sources/CubeSource';
import vtkSphereSource from 'vtk.js/Sources/Filters/Sources/SphereSource';
import vtkXMLPolyDataReader from 'vtk.js/Sources/IO/XML/XMLPolyDataReader';

import vtkFPSMonitor from 'vtk.js/Sources/Interaction/UI/FPSMonitor';

//OBJ reader
import vtkOBJReader from 'vtk.js/Sources/IO/Misc/OBJReader';
import vtkMTLReader from 'vtk.js/Sources/IO/Misc/MTLReader';


import {
    ColorMode,
    ScalarMode,
} from 'vtk.js/Sources/Rendering/Core/Mapper/Constants';

import style from '../content/GeometryViewer.mcss';
import controlPanel from '../content/controlPanel.html';

let autoInit = true;
let background = [0, 0, 0];
let renderWindow;
let renderer;

global.pipeline = {};

const mapPrefix = "map";
// Process arguments from URL
const userParams = vtkURLExtract.extractURLParameters();

// Background handling
if (userParams.background) {
    background = userParams.background.split(',').map((s) => Number(s));
}
const selectorClass =
    background.length === 3 && background.reduce((a, b) => a + b, 0) < 1.5
        ? style.dark
        : style.light;

// lut
const lutName = userParams.lut || 'RED_TEMPERATURE';//'erdc_rainbow_bright';

// field
const field = userParams.field || '';

// camera
function updateCamera(camera) {
    // camera.setPosition(0, 0, 0);
    ['zoom', 'pitch', 'elevation', 'yaw', 'azimuth', 'roll', 'dolly'].forEach(
        (key) => {
            if (userParams[key]) {
                camera[key](userParams[key]);
            }
            renderWindow.render();
        }
    );
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// ----------------------------------------------------------------------------
// DOM containers for UI control
// ----------------------------------------------------------------------------

const rootControllerContainer = document.createElement('div');
rootControllerContainer.setAttribute('class', style.rootController);

const addDataSetButton = document.createElement('img');
addDataSetButton.setAttribute('class', style.button);
// addDataSetButton.setAttribute('src', icon);
addDataSetButton.addEventListener('click', () => {
    const isVisible = rootControllerContainer.style.display !== 'none';
    rootControllerContainer.style.display = isVisible ? 'none' : 'flex';
});

const fpsMonitor = vtkFPSMonitor.newInstance();
const fpsElm = fpsMonitor.getFpsMonitorContainer();
fpsElm.classList.add(style.fpsMonitor);

// ----------------------------------------------------------------------------
// Add class to body if iOS device
// ----------------------------------------------------------------------------

const iOS = /iPad|iPhone|iPod/.test(window.navigator.platform);

if (iOS) {
    document.querySelector('body').classList.add('is-ios-device');
}

// ----------------------------------------------------------------------------

function emptyContainer(container) {
    fpsMonitor.setContainer(null);
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

// ----------------------------------------------------------------------------
const STYLE_CONTROL_PANEL = {
    position: 'absolute',
    left: '25px',
    top: '35px',
    backgroundColor: 'white',
    borderRadius: '5px',
    listStyle: 'none',
    padding: '5px 10px',
    margin: '0',
    display: 'block',
    border: 'solid 1px black',
    maxWidth: '40%',
    maxHeight: '70%',
    overflow: 'auto',
};

//OBJ
function loadOBJ(file) {
    const reader = new FileReader();
    reader.onload = function onLoad(e) {
        const objReader = vtkOBJReader.newInstance();
        objReader.parseAsText(reader.result);
        const nbOutputs = objReader.getNumberOfOutputPorts();
        for (let idx = 0; idx < nbOutputs; idx++) {
            const source = objReader.getOutputData(idx);
            const mapper = vtkMapper.newInstance();
            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);
            mapper.setInputData(source);
            renderer.addActor(actor);
            global.pipeline['obj'+idx] = {
                actor: actor,
                mapper,
                source,
                renderer,
                renderWindow,
            };
        }
        renderer.resetCamera();
        renderWindow.render();
    };
    reader.readAsText(file);
    createPipelineForOBJ();

}

//OBJ Zip
function loadZipContent(zipContent, renderWindow, renderer) {
    const fileContents = {obj: {}, mtl: {}, img: {}};
    const zip = new JSZip();
    zip.loadAsync(zipContent).then(() => {
        let workLoad = 0;

        function done() {
            if (workLoad !== 0) {
                return;
            }
            // Attach images to MTLs
            Object.keys(fileContents.mtl).forEach((mtlFilePath) => {
                const mtlReader = fileContents.mtl[mtlFilePath];
                const basePath = mtlFilePath
                    .split('/')
                    .filter((v, i, a) => i < a.length - 1)
                    .join('/');
                mtlReader.listImages().forEach((relPath) => {
                    const key = `${basePath}/${relPath}`;
                    const imgSRC = fileContents.img[key];
                    if (imgSRC) {
                        mtlReader.setImageSrc(relPath, imgSRC);
                    }
                });
            });

            // Create pipeline from obj
            Object.keys(fileContents.obj).forEach((objFilePath) => {
                const mtlFilePath = objFilePath.replace(/\.obj$/, '.mtl');
                const objReader = fileContents.obj[objFilePath];
                const mtlReader = fileContents.mtl[mtlFilePath];

                const size = objReader.getNumberOfOutputPorts();
                for (let i = 0; i < size; i++) {
                    const source = objReader.getOutputData(i);
                    const mapper = vtkMapper.newInstance();
                    const actor = vtkActor.newInstance();
                    const name = source.get('name').name;

                    actor.setMapper(mapper);
                    mapper.setInputData(source);
                    renderer.addActor(actor);
                    global.pipeline['obj'+i] = {
                        actor: actor,
                        mapper,
                        source,
                        renderer,
                        renderWindow,
                    };
                    if (mtlReader && name) {
                        mtlReader.applyMaterialToActor(name, actor);
                    }
                }
            });
            renderer.resetCamera();
            renderWindow.render();

            // Rerender with hopefully all the textures loaded
            setTimeout(renderWindow.render, 500);
        }

        zip.forEach((relativePath, zipEntry) => {
            if (relativePath.match(/\.obj$/i)) {
                workLoad++;
                zipEntry.async('string').then((txt) => {
                    const reader = vtkOBJReader.newInstance({splitMode: 'usemtl'});
                    reader.parseAsText(txt);
                    fileContents.obj[relativePath] = reader;
                    workLoad--;
                    done();
                });
            }
            if (relativePath.match(/\.mtl$/i)) {
                workLoad++;
                zipEntry.async('string').then((txt) => {
                    const reader = vtkMTLReader.newInstance();
                    reader.parseAsText(txt);
                    fileContents.mtl[relativePath] = reader;
                    workLoad--;
                    done();
                });
            }
            if (relativePath.match(/\.jpg$/i) || relativePath.match(/\.png$/i)) {
                workLoad++;
                zipEntry.async('base64').then((txt) => {
                    const ext = relativePath.slice(-3).toLowerCase();
                    fileContents.img[relativePath] = `data:image/${ext};base64,${txt}`;
                    workLoad--;
                    done();
                });
            }
        });
    });
    createPipelineForOBJ();
}

function createViewer(container) {
    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        background,
        rootContainer: container,
        containerStyle: {height: '100%', width: '100%', position: 'absolute'},
        controlPanelStyle: STYLE_CONTROL_PANEL

    });
    renderer = fullScreenRenderer.getRenderer();
    renderWindow = fullScreenRenderer.getRenderWindow();
    renderWindow.getInteractor().setDesiredUpdateRate(15);

    fullScreenRenderer.addController(controlPanel);

    // bind the dimension control
    ['xLength', 'yLength', 'zLength'].forEach((propertyName) => {
        document.querySelector(`.${propertyName}`).addEventListener('input', (e) => {
            const value = Number(e.target.value) * 100;
            global.pipeline['cube'].cubeSource.set({[propertyName]: value});
            renderer.resetCameraClippingRange();
            renderWindow.render();
        })
    })

    // bind the position control
    const centerElems = document.querySelectorAll('.center');
    const rotationsElems = document.querySelectorAll('.rotations');

    function updateTransformedCube() {
        const center = [0, 0, 0];
        const rotations = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            center[Number(centerElems[i].dataset.index)] = Number(centerElems[i].value);
            rotations[Number(rotationsElems[i].dataset.index)] = Number(
                rotationsElems[i].value
            );
        }
        global.pipeline['cube'].cubeSource.set({center, rotations});
        renderer.resetCameraClippingRange();
        renderWindow.render();
    }

    for (let i = 0; i < 3; i++) {
        centerElems[i].addEventListener('input', updateTransformedCube);
        rotationsElems[i].addEventListener('input', updateTransformedCube);
    }

    container.appendChild(rootControllerContainer);
    container.appendChild(addDataSetButton);

    if (userParams.fps) {
        if (Array.isArray(userParams.fps)) {
            fpsMonitor.setMonitorVisibility(...userParams.fps);
            if (userParams.fps.length === 4) {
                fpsMonitor.setOrientation(userParams.fps[3]);
            }
        }
        fpsMonitor.setRenderWindow(renderWindow);
        fpsMonitor.setContainer(container);
        fullScreenRenderer.setResizeCallback(fpsMonitor.update);
    }
}

function createPipelineForOBJ() {
    // Create UI

    const controlContainer = document.createElement('div');
    controlContainer.setAttribute('class', style.control);
    rootControllerContainer.appendChild(controlContainer);

    const cubeSource = vtkCubeSource.newInstance();
    const camSource = vtkSphereSource.newInstance();

    const cubeMapper = vtkMapper.newInstance();
    const camMapper = vtkMapper.newInstance();

    const cubeActor = vtkActor.newInstance();
    const camActor = vtkActor.newInstance();

    cubeSource.set({xLength: 52, yLength: 49.5, zLength: 84.5});
    camSource.set({'radius': 5});
    camActor.getProperty().setColor(247 / 255, 226 / 255, 104 / 255);

    // --------------------------------------------------------------------
    // Pipeline handling
    // --------------------------------------------------------------------

    cubeActor.setMapper(cubeMapper);
    camActor.setMapper(camMapper);

    cubeMapper.setInputConnection(cubeSource.getOutputPort());
    camMapper.setInputConnection(camSource.getOutputPort());

    renderer.addActor(cubeActor);
    renderer.addActor(camActor);
    // settings for map object


    // camActor.setPosition(mapActor.getCenter());

    // First render
    renderer.resetCamera();
    renderWindow.render();

    global.pipeline['cube'] = {
        actor: cubeActor,
        cubeMapper,
        cubeSource,
        renderer,
        renderWindow,
    };
    global.pipeline['cam'] = {
        actor: camActor,
        camMapper,
        camSource,
        renderer,
        renderWindow,
    };

    camActor.setPosition(global.pipeline['obj0'].actor.getCenter());

    if (userParams.fileURL.includes(mapPrefix) || options.fileURL.includes(mapPrefix)) {
        global.pipeline['obj0'].actor.setPosition(global.pipeline['obj0'].actor.getCenter());
        global.pipeline['obj0'].actor.getProperty().setPointSize(3);
        renderWindow.render();
    }
    // Update stats
    fpsMonitor.update();
}

// ----------------------------------------------------------------------------

function createPipeline(fileName, fileContents) {
    // Create UI
    const presetSelector = document.createElement('select');
    presetSelector.setAttribute('class', selectorClass);
    presetSelector.innerHTML = vtkColorMaps.rgbPresetNames
        .map(
            (name) =>
                `<option value="${name}" ${
                    lutName === name ? 'selected="selected"' : ''
                    }>${name}</option>`
        )
        .join('');

    const colorBySelector = document.createElement('select');
    colorBySelector.setAttribute('class', selectorClass);

    const componentSelector = document.createElement('select');
    componentSelector.setAttribute('class', selectorClass);
    componentSelector.style.display = 'none';

    const opacitySelector = document.createElement('input');
    opacitySelector.setAttribute('class', selectorClass);
    opacitySelector.setAttribute('type', 'range');
    opacitySelector.setAttribute('value', '100');
    opacitySelector.setAttribute('max', '100');
    opacitySelector.setAttribute('min', '1');

    const labelSelector = document.createElement('label');
    labelSelector.setAttribute('class', selectorClass);
    labelSelector.innerHTML = fileName;

    const controlContainer = document.createElement('div');
    controlContainer.setAttribute('class', style.control);
    controlContainer.appendChild(labelSelector);
    // controlContainer.appendChild(representationSelector);
    controlContainer.appendChild(presetSelector);
    controlContainer.appendChild(colorBySelector);
    controlContainer.appendChild(componentSelector);
    controlContainer.appendChild(opacitySelector);
    rootControllerContainer.appendChild(controlContainer);

    // VTK pipeline
    const vtpReader = vtkXMLPolyDataReader.newInstance();
    vtpReader.parseAsArrayBuffer(fileContents);

    const lookupTable = vtkColorTransferFunction.newInstance();
    const source = vtpReader.getOutputData(0);
    const cubeSource = vtkCubeSource.newInstance();
    const camSource = vtkSphereSource.newInstance();
    const mapper = vtkMapper.newInstance({
        interpolateScalarsBeforeMapping: false,
        useLookupTableScalarRange: true,
        lookupTable,
        scalarVisibility: false,
    });
    const cubeMapper = vtkMapper.newInstance();
    const camMapper = vtkMapper.newInstance();
    const mapActor = vtkActor.newInstance();
    const cubeActor = vtkActor.newInstance();
    const camActor = vtkActor.newInstance();
    const scalars = source.getPointData().getScalars();
    const dataRange = [].concat(scalars ? scalars.getRange() : [0, 1]);

    // --------------------------------------------------------------------
    // Color handling
    // --------------------------------------------------------------------

    function applyPreset() {
        const preset = vtkColorMaps.getPresetByName(presetSelector.value);
        lookupTable.applyColorMap(preset);
        lookupTable.setMappingRange(dataRange[0], dataRange[1]);
        lookupTable.updateRange();
    }

    applyPreset();
    presetSelector.addEventListener('change', applyPreset);

    // --------------------------------------------------------------------
    // Opacity handling
    // --------------------------------------------------------------------

    function updateOpacity(event) {
        const opacity = Number(event.target.value) / 100;
        mapActor.getProperty().setOpacity(opacity);
        renderWindow.render();
    }

    opacitySelector.addEventListener('input', updateOpacity);

    // --------------------------------------------------------------------
    // ColorBy handling
    // --------------------------------------------------------------------

    const colorByOptions = [{value: ':', label: 'Solid color'}].concat(
        source
            .getPointData()
            .getArrays()
            .map((a) => ({
                label: `(p) ${a.getName()}`,
                value: `PointData:${a.getName()}`,
            })),
        source
            .getCellData()
            .getArrays()
            .map((a) => ({
                label: `(c) ${a.getName()}`,
                value: `CellData:${a.getName()}`,
            }))
    );
    colorBySelector.innerHTML = colorByOptions
        .map(
            ({label, value}) =>
                `<option value="${value}" ${
                    field === value ? 'selected="selected"' : ''
                    }>${label}</option>`
        )
        .join('');

    function updateColorBy(event) {
        const [location, colorByArrayName] = event.target.value.split(':');
        const interpolateScalarsBeforeMapping = location === 'PointData';
        let colorMode = ColorMode.DEFAULT;
        let scalarMode = ScalarMode.DEFAULT;
        const scalarVisibility = location.length > 0;
        if (scalarVisibility) {
            const activeArray = source[`get${location}`]().getArrayByName(
                colorByArrayName
            );
            const newDataRange = activeArray.getRange();
            dataRange[0] = newDataRange[0];
            dataRange[1] = newDataRange[1];
            colorMode = ColorMode.MAP_SCALARS;
            scalarMode =
                location === 'PointData'
                    ? ScalarMode.USE_POINT_FIELD_DATA
                    : ScalarMode.USE_CELL_FIELD_DATA;

            const numberOfComponents = activeArray.getNumberOfComponents();
            if (numberOfComponents > 1) {
                // always start on magnitude setting
                if (mapper.getLookupTable()) {
                    const lut = mapper.getLookupTable();
                    lut.setVectorModeToMagnitude();
                }
                componentSelector.style.display = 'block';
                const compOpts = ['Magnitude'];
                while (compOpts.length <= numberOfComponents) {
                    compOpts.push(`Component ${compOpts.length}`);
                }
                componentSelector.innerHTML = compOpts
                    .map((t, index) => `<option value="${index - 1}">${t}</option>`)
                    .join('');
            } else {
                componentSelector.style.display = 'none';
            }
        } else {
            componentSelector.style.display = 'none';
        }
        mapper.set({
            colorByArrayName,
            colorMode,
            interpolateScalarsBeforeMapping,
            scalarMode,
            scalarVisibility,
        });
        applyPreset();
    }

    colorBySelector.addEventListener('change', updateColorBy);
    updateColorBy({target: colorBySelector});

    function updateColorByComponent(event) {
        if (mapper.getLookupTable()) {
            const lut = mapper.getLookupTable();
            if (event.target.value === -1) {
                lut.setVectorModeToMagnitude();
            } else {
                lut.setVectorModeToComponent();
                lut.setVectorComponent(Number(event.target.value));
            }
            renderWindow.render();
        }
    }

    componentSelector.addEventListener('change', updateColorByComponent);

    cubeSource.set({xLength: 52, yLength: 49.5, zLength: 84.5});
    camSource.set({'radius': 5});
    camActor.getProperty().setColor(247 / 255, 226 / 255, 104 / 255);

    // --------------------------------------------------------------------
    // Pipeline handling
    // --------------------------------------------------------------------

    mapActor.setMapper(mapper);
    cubeActor.setMapper(cubeMapper);
    camActor.setMapper(camMapper);
    mapper.setInputData(source);
    cubeMapper.setInputConnection(cubeSource.getOutputPort());
    camMapper.setInputConnection(camSource.getOutputPort());
    renderer.addActor(mapActor);
    renderer.addActor(cubeActor);
    renderer.addActor(camActor);
    // settings for map object

    // Manage update when lookupTable change
    lookupTable.onModified(() => {
        renderWindow.render();
    });


    // camActor.setPosition(mapActor.getCenter());

    // First render
    renderer.resetCamera();
    renderWindow.render();

    global.pipeline[fileName] = {
        actor: mapActor,
        mapper,
        source,
        lookupTable,
        renderer,
        renderWindow,
    };
    global.pipeline['cube'] = {
        actor: cubeActor,
        cubeMapper,
        cubeSource,
        renderer,
        renderWindow,
    };
    global.pipeline['cam'] = {
        actor: camActor,
        camMapper,
        camSource,
        renderer,
        renderWindow,
    };


    camActor.setPosition(mapActor.getCenter());

    if (userParams.fileURL.includes(mapPrefix) || options.fileURL.includes(mapPrefix)) {
        mapActor.setPosition(mapActor.getCenter());
        mapActor.getProperty().setPointSize(3);
        renderWindow.render();
    }
    // Update stats
    fpsMonitor.update();
}

// ----------------------------------------------------------------------------

function loadFile(file) {
    const reader = new FileReader();
    reader.onload = function onLoad(e) {
        createPipeline(file.name, reader.result);
    };
    reader.readAsArrayBuffer(file);
}

// ----------------------------------------------------------------------------

export function load(container, options) {
    autoInit = false;
    emptyContainer(container);

    if (options.files) {
        console.log(options.files);
        console.log(options.ext);


        createViewer(container);
        if (options.files[0].name.includes('obj')) {
            loadOBJ(options.files[0]);
        } else if (options.files[0].name.includes('zip')) {
            loadZipContent(options.files[0], renderWindow, renderer);
        } else {
            let count = options.files.length;
            while (count--) {
                loadFile(options.files[count]);
            }
        }
        updateCamera(renderer.getActiveCamera());
    } else if (options.fileURL) {
        const urls = [].concat(options.fileURL);
        const progressContainer = document.createElement('div');
        progressContainer.setAttribute('class', style.progress);
        container.appendChild(progressContainer);

        const progressCallback = (progressEvent) => {
            if (progressEvent.lengthComputable) {
                const percent = Math.floor(
                    100 * progressEvent.loaded / progressEvent.total
                );
                progressContainer.innerHTML = `Loading ${percent}%`;
            } else {
                progressContainer.innerHTML = macro.formatBytesToProperUnit(
                    progressEvent.loaded
                );
            }
        };

        createViewer(container);
        const nbURLs = urls.length;
        let nbLoadedData = 0;

        /* eslint-disable no-loop-func */
        while (urls.length) {
            const url = urls.pop();
            const name = Array.isArray(userParams.name)
                ? userParams.name[urls.length]
                : `Data ${urls.length + 1}`;
            HttpDataAccessHelper.fetchBinary(url, {
                progressCallback,
            }).then((binary) => {
                nbLoadedData++;
                if (nbLoadedData === nbURLs) {
                    container.removeChild(progressContainer);
                }
                createPipeline(name, binary);
                updateCamera(renderer.getActiveCamera());
            });
        }
    }
}

export function initLocalFileLoader(container) {
    const exampleContainer = document.querySelector('.content');
    const rootBody = document.querySelector('body');
    const myContainer = container || exampleContainer || rootBody;

    if (myContainer !== container) {
        myContainer.classList.add(style.fullScreen);
        rootBody.style.margin = '0';
        rootBody.style.padding = '0';
    } else {
        rootBody.style.margin = '0';
        rootBody.style.padding = '0';
    }

    const fileContainer = document.createElement('div');
    fileContainer.innerHTML = `<div class="${
        style.bigFileDrop
        }"/><input type="file" multiple accept=".vtp,.zip,.obj" style="display: none;"/>`;
    myContainer.appendChild(fileContainer);

    const fileInput = fileContainer.querySelector('input');

    function handleFile(e) {
        preventDefaults(e);
        const dataTransfer = e.dataTransfer;
        const files = e.target.files || dataTransfer.files;
        if (files.length > 0) {
            myContainer.removeChild(fileContainer);
            load(myContainer, {files});
        }
    }

    fileInput.addEventListener('change', handleFile);
    fileContainer.addEventListener('drop', handleFile);
    fileContainer.addEventListener('click', (e) => fileInput.click());
    fileContainer.addEventListener('dragover', preventDefaults);
}

// Look at URL an see if we should load a file
// ?fileURL=https://data.kitware.com/api/v1/item/59cdbb588d777f31ac63de08/download
if (userParams.url || userParams.fileURL) {
    const exampleContainer = document.querySelector('.content');
    const rootBody = document.querySelector('body');
    const myContainer = exampleContainer || rootBody;

    if (myContainer) {
        myContainer.classList.add(style.fullScreen);
        rootBody.style.margin = '0';
        rootBody.style.padding = '0';
    }

    load(myContainer, userParams);
}

// Auto setup if no method get called within 100ms
setTimeout(() => {
    if (autoInit) {
        initLocalFileLoader();
    }
}, 100);
