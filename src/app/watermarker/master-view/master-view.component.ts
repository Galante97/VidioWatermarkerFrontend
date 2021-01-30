import {
  Component,
  OnInit,
  HostListener,
  ElementRef,
  Inject,
} from '@angular/core';
import { VideoProcessingService } from '../../video-processing-service';
import Ruler from '@scena/ruler';
import Moveable from 'moveable';
import { WatermarkerComponent } from '../watermarker.component';

// Stepper enum
enum stepDirection {
  BACKWARDS,
  FOWARDS,
  NONE,
}

@Component({
  selector: 'app-master-view',
  templateUrl: './master-view.component.html',
  styleUrls: ['./master-view.component.scss'],
})
export class MasterViewComponent implements OnInit {
  // ===========================================================================
  // GLOBAL VARIBLES
  // ===========================================================================

  // String of data that contains the video thumbnail
  public videoThumbnailData: string;

  // Actual video file
  public videoFile: File;

  // Real Video Width and Height
  public videoWidth;
  public videoHieght;

  // Containers
  public masterContainer;
  public ddVidContainer;
  public videoThumbnailContainer;
  public wmContainer;

  // Stepper counter
  step = 0;

  // Watermark varibles
  public moveable: Moveable; // dragable container
  public imageSrc; // image bits
  public imgFile; // watermark image file
  public bounds; // bounds of wm

  // actual values of the watermark
  public wmX;
  public wmY;
  public wmW;
  public wmH;
  public wmRotate = 0;

  // frame of watermark image
  frame = {
    translate: [0, 0],
    rotate: 0,
  };

  // rulers
  rulerH: Ruler;
  rulerV: Ruler;

  // ===========================================================================
  // CONSTRUCTOR AND INITs
  // ===========================================================================

  constructor(
    private videoService: VideoProcessingService,
    @Inject(WatermarkerComponent) private wmComp: WatermarkerComponent
  ) {}

  ngOnInit(): void {
    this.initContainers(); // initalize containers
    this.updateRulers(); // initalize rulers
    this.stepper(stepDirection.NONE); // set step to zero
    this.updateVideoBoundary(); // intial set up of bounds of video
  }

  /**
   * initialization of global containers for later use and manipulation
   */
  initContainers() {
    this.masterContainer = document.getElementById(
      'master'
    ) as HTMLCollectionOf<HTMLElement>[0];

    this.ddVidContainer = document.getElementById(
      'ddVidContainer'
    ) as HTMLCollectionOf<HTMLElement>[0];

    this.videoThumbnailContainer = document.getElementById(
      'videoThumbnailContainer'
    ) as HTMLCollectionOf<HTMLElement>[0];

    this.wmContainer = document.getElementById(
      'wmContainer'
    ) as HTMLCollectionOf<HTMLElement>[0];
  }

  // =============================================================================
  // WINDOW RESIZE AND SCROLL EVENT CALLERS
  // =============================================================================

  /**
   * update all rects when window changes size
   * @param event window resize
   */
  @HostListener('window:resize', ['$event'])
  onWindowResize(event) {
    try {
      this.updateRulers();
      this.updateVideoBoundary();
      this.updateGuideline();
      this.moveable.updateRect();
    } catch (e) {}
  }

  /**
   * updates rects and widows on scroll
   * @param event scroll
   */
  onMasterScroll(event) {
    this.updateRulers();
    this.updateVideoBoundary();
    this.moveable.updateRect();
  }

  // ===========================================================================
  // MOVABLE OBJECT LOGIC
  // ===========================================================================

  /**
   * create the watermarkable image
   */
  generateMovableObject() {
    this.moveable = new Moveable(this.masterContainer, {
      target: document.querySelector('.wmContainer') as HTMLCanvasElement,
      draggable: true,
      resizable: true,
      bounds: this.bounds,
      throttleScale: 0,
      keepRatio: true,
      rotatable: true,
      throttleRotate: 0,
      rotationPosition: 'top',

      snappable: true,
      snapHorizontal: true,
      snapVertical: true,
      snapCenter: true,
    });

    this.moveable
      .on('resizeStart', ({ target, set, setOrigin, dragStart }) => {
        this.moveableResizeStart(target, set, setOrigin, dragStart);
      })
      .on('resize', ({ target, width, height, drag }) => {
        this.moveableResize(target, width, height, drag);
      })
      .on('resizeEnd', ({ target, isDrag, clientX, clientY }) => {
        this.moveableResizeEnd(target, isDrag, clientX, clientY);
      })
      .on('dragStart', ({ set }) => {
        this.moveableDragStart(set);
      })
      .on('drag', ({ target, beforeTranslate }) => {
        this.moveableDrag(target, beforeTranslate);
      })
      .on('dragEnd', ({ target, isDrag, clientX, clientY }) => {
        this.moveableDragEnd(target, isDrag, clientX, clientY);
      })
      .on('rotate', ({ target, beforeDelta, delta }) => {
        this.moveableRotate(target, beforeDelta, delta);
      })
      .on('rotateEnd', ({ target, isDrag, clientX, clientY }) => {
        this.moveableRotateEnd(target, isDrag, clientX, clientY);
      });

    this.updateGuideline();
  }

  /**
   * called when the resize of the watermark starts
   * @param target taget
   * @param set set
   * @param setOrigin setOrigin
   * @param dragStart dragStart
   */
  moveableResizeStart(target, set, setOrigin, dragStart) {
    // Set origin if transform-orgin use %.
    setOrigin(['%', '%']);

    // If cssSize and offsetSize are different, set cssSize. (no box-sizing)
    const style = window.getComputedStyle(target);
    const cssWidth = parseFloat(style.width);
    const cssHeight = parseFloat(style.height);
    set([cssWidth, cssHeight]);

    // If a drag event has already occurred, there is no dragStart.
    // tslint:disable-next-line:no-unused-expression
    dragStart && dragStart.set(this.frame.translate);
  }

  /**
   * called while object is being resized
   * @param target target
   * @param width width
   * @param height height
   * @param drag drag
   */
  moveableResize(target, width, height, drag) {
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;

    // get drag event
    this.frame.translate = drag.beforeTranslate;
    target.style.transform = `translate(${drag.beforeTranslate[0]}px, ${drag.beforeTranslate[1]}px) rotate(${this.frame.rotate}deg)`;

    this.getRelativeWH();
    this.getRelativeXY();
  }

  /**
   * called when the resize of the watermark ends
   * @param target target
   * @param isDrag isDrag
   * @param clientX clientX
   * @param clientY clientY
   */
  moveableResizeEnd(target, isDrag, clientX, clientY) {
    // console.log('onResizeEnd', target, isDrag);

    this.getRelativeWH();
    this.getRelativeXY();
  }

  /**
   * when drag of watermark starts
   * @param set set
   */
  moveableDragStart(set) {
    set(this.frame.translate);
  }

  /**
   * called when the watermark is being dragged
   * @param target target
   * @param beforeTranslate beforeTranslate
   */
  moveableDrag(target, beforeTranslate) {
    this.frame.translate = beforeTranslate;
    target.style.transform = `translate(${beforeTranslate[0]}px, ${beforeTranslate[1]}px) rotate(${this.frame.rotate}deg)`;

    this.getRelativeWH();
    this.getRelativeXY();
  }

  /**
   * called when the drag of the watermark ends
   * @param target target
   * @param isDrag isDrag
   * @param clientX clientX
   * @param clientY clientY
   */
  moveableDragEnd(target, isDrag, clientX, clientY) {
    // console.log('onDragEnd', target, isDrag);

    this.getRelativeWH();
    this.getRelativeXY();
  }

  /**
   * called when the watermark is being rotated
   * @param target target
   * @param beforeDelta beforeDelta
   * @param delta delta
   */
  moveableRotate(target, beforeDelta, delta) {
    this.frame.rotate += delta;
    this.frame.rotate = Math.round(this.frame.rotate);

    this.wmRotate = this.frame.rotate;

    if (this.frame.rotate < 0) {
      this.frame.rotate += 359;
    }

    while (this.frame.rotate > 360) {
      this.frame.rotate -= 360;
    }
    // console.log(this.frame);

    target.style.transform = `translate(${this.frame.translate[0]}px, ${this.frame.translate[1]}px) rotate(${this.frame.rotate}deg)`;

    this.getRelativeWH();
    this.getRelativeXY();
  }

  /**
   * rotate ends on the watermark
   * @param target target
   * @param isDrag isDrag
   * @param clientX clientX
   * @param clientY clientY
   */
  moveableRotateEnd(target, isDrag, clientX, clientY) {
    // console.log('onRotateEnd', target, isDrag);

    this.getRelativeWH();
    this.getRelativeXY();
  }

  // ===========================================================================
  // RELATIVE WIDTH, HEIGHT, X, Y LOGIC
  // ===========================================================================

  /**
   * get X and Y based on where the watermark relative to the video
   */
  getRelativeXY() {
    const wmBoundingRect = this.wmContainer.getBoundingClientRect();
    const vidBoundingRect = this.videoThumbnailContainer.getBoundingClientRect();
    // console.log(wmBoundingRect);

    const X =
      (wmBoundingRect.x + wmBoundingRect.width / 2 - vidBoundingRect.x) /
      this.getRulerMultipliers().hRulerMult;
    const Y =
      (wmBoundingRect.y + wmBoundingRect.height / 2 - vidBoundingRect.y) /
      this.getRulerMultipliers().vRulerMult;

    // console.log('x: ', X, 'y: ', Y);
    return {
      x: Math.round(X),
      y: Math.round(Y),
    };
  }

  /**
   * get the width and height of the watermark relative to the video
   */
  getRelativeWH() {
    try {
      const wmBoundsWidth: number = Number(
        this.wmContainer.style.width.slice(0, -2)
      );
      const wmBoundsHeight: number = Number(
        this.wmContainer.style.height.slice(0, -2)
      );
      const W = wmBoundsWidth / this.getRulerMultipliers().hRulerMult;
      const H = wmBoundsHeight / this.getRulerMultipliers().vRulerMult;

      return {
        w: Math.round(W),
        h: Math.round(H),
      };
    } catch (e) {
      return {
        w: 0,
        h: 0,
      };
    }
  }

  // ===========================================================================
  // RULER LOGIC
  // ===========================================================================

  /**
   * helper function to call other update ruler functions
   */
  updateRulers() {
    this.updateHRuler(this.getRulerMultipliers());
    this.updateVRuler(this.getRulerMultipliers());
  }

  /**
   * update horizontal ruler
   * @param rulerMultipliers zoom multipler
   */
  updateHRuler(rulerMultipliers) {
    try {
      this.rulerH.destroy();
    } catch (e) {}
    this.rulerH = new Ruler(document.querySelector('.ruler.horizontal'), {
      type: 'horizontal',
      unit: 100,
      zoom: rulerMultipliers.hRulerMult,
      backgroundColor: '#2a2a2a',
      lineColor: '#a0a0a0',
      textColor: '#a0a0a0',
    });

    this.rulerH.scroll(rulerMultipliers.hRulerShift);
  }

  /**
   * update veritical ruler
   * @param rulerMultipliers zoom multipler
   */
  updateVRuler(rulerMultipliers) {
    try {
      this.rulerV.destroy();
    } catch (e) {}
    this.rulerV = new Ruler(document.querySelector('.ruler.vertical'), {
      type: 'vertical',
      unit: 100,
      zoom: rulerMultipliers.vRulerMult,
      backgroundColor: '#2a2a2a',
      lineColor: ' #a0a0a0',
      textColor: '#a0a0a0',
    });

    this.rulerV.scroll(rulerMultipliers.vRulerShift);
  }

  /**
   * creates the multiplier value from video width to actual bounds width
   */
  getRulerMultipliers() {
    const vidBounds = this.videoThumbnailContainer.getBoundingClientRect();
    const masterBounds = this.masterContainer.getBoundingClientRect();

    // console.log('master bounds', masterBounds);
    // console.log('vidBounds', vidBounds);

    const hShift = masterBounds.x - vidBounds.x;
    const vShift = masterBounds.y - vidBounds.y;

    if (!this.videoWidth || !this.videoHieght) {
      return {
        hRulerShift: 0,
        vRulerShift: 0,
        hRulerMult: 1,
        vRulerMult: 1,
      };
    }

    const VidBoundsW = vidBounds.width;
    const VidBboundsH = vidBounds.height;

    /* console.log('---------------------');
    console.log('boundsW', VidBoundsW);
    console.log('videoW', this.videoWidth);
    console.log('boundsH', VidBboundsH);
    console.log('this.videoH', this.videoHieght);

    console.log('hRulerShift', hShift);
    console.log('vRulerShift', vShift);
    console.log('hRulerMult', VidBoundsW / this.videoWidth);
    console.log('vRulerMult', VidBboundsH / this.videoHieght);
    console.log('---------------------'); */

    return {
      hRulerShift: hShift / (VidBoundsW / this.videoWidth),
      vRulerShift: vShift / (VidBboundsH / this.videoHieght),
      hRulerMult: VidBoundsW / this.videoWidth,
      vRulerMult: VidBboundsH / this.videoHieght,
    };
  }

  // =============================================================================
  // VIDEO INITAIL HANDLING
  // =============================================================================

  /**
   * on file drop handler for when video is dropped
   */
  onFileDropped($event) {
    this.prepareVideoAndThumbnail($event);
  }
  /**
   * Convert Files list to normal array list, used for drag and drop video
   * @param files (Files List)
   */
  prepareVideoAndThumbnail(files: Array<any>) {
    console.log('FILES', files);

    let currFile;
    if (files == null) {
      currFile = null;
    } else {
      currFile = files[0];
    }

    let fileToBig = false;

    this.videoService
      .promptForVideo(currFile)
      .then((videoFile) => {
        this.videoFile = videoFile;

        console.log('Then video file', this.videoFile);

        if (this.videoFile.size > 200000000) {
          fileToBig = true;
          alert('Sorry, we only currently support video files under 200mb');
          location.reload();
        }

        return this.videoService.generateThumbnail(videoFile);
      })
      .then((thumbnailData) => {
        if (!fileToBig) {
          this.videoThumbnailData = thumbnailData[0];

          const vidW = thumbnailData[1];
          const vidH = thumbnailData[2];

          this.videoWidth = vidW;
          this.videoHieght = vidH;

          // console.log('Real video width: ', vidW);
          // console.log('Real video height ', vidH);

          this.generateVideoInViewSize(vidW, vidH);

          this.videoThumbnailContainer.style.backgroundImage =
            'url(' + this.videoThumbnailData + ')';

          this.stepper(stepDirection.FOWARDS);
          this.updateRulers();
        }
      });
  }

  /**
   * used to make sure the video thumbnail is the correct ratio
   * @param w width
   * @param h height
   */
  generateVideoInViewSize(w: any, h: any) {
    const masterContainerH = this.masterContainer.clientHeight;
    const masterContainerW = this.masterContainer.clientWidth;

    let spaceFactor = 0.95;
    if (masterContainerW < 500) {
      spaceFactor = 0.99;
    }

    while (
      masterContainerW * spaceFactor < w ||
      masterContainerH * spaceFactor < h
    ) {
      w = w * spaceFactor;
      h = h * spaceFactor;
    }
    this.videoThumbnailContainer.style.width = w + 'px';
    this.videoThumbnailContainer.style.height = h + 'px';
  }

  // ===========================================================================
  // IMAGE (WM) INITAIL HANDLING
  // ===========================================================================

  /**
   * read the image when the user picks from the dropdwon
   * @param event pick image
   */
  readImageURL(event: Event): void {
    console.log('READ IMAGE URL');
    const URL = window.URL || window.webkitURL;
    const Img = new Image();
    const target = event.target as HTMLInputElement;

    const filesToUpload = target.files;
    this.imgFile = filesToUpload[0];
    console.log(this.imgFile);
    Img.src = URL.createObjectURL(filesToUpload[0]);

    console.log(Img.src);

    Img.onload = (e: any) => {
      console.log('ONLOAD', e);

      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );
      let height;
      let width;
      if (isSafari) {
        height = e.target.height;
        width = e.target.width;
      } else {
        height = e.path[0].height;
        width = e.path[0].width;
      }

      console.log('h', height);
      console.log('w', width);

      this.generateInitialWMSize(width, height);
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      this.imageSrc = reader.result;
      // console.log(this.imageSrc);
    };

    reader.readAsDataURL(filesToUpload[0]); // this line adds the picture

    this.wmContainer.style.display = 'block';

    this.updateVideoBoundary();
  }

  /**
   * TODO partial implenetation - when watermark is loaded it should load with the correct ratio and size
   * @param width w
   * @param height h
   */
  generateInitialWMSize(width, height) {
    const wmContainer = document.getElementById(
      'wmContainer'
    ) as HTMLCollectionOf<HTMLElement>[0];

    console.log('width', width);
    console.log('height', height);

    const cW = 200;
    const ratio = width / cW;
    const cH = height / ratio;

    console.log('cW, cH', cW, cH);

    wmContainer.style.width = `${cW}px`;
    wmContainer.style.height = `${cH}px`;

    this.moveable.updateRect();
  }

  // ===========================================================================
  // STEPPER LOGIC
  // ===========================================================================

  /**
   *  in charge of handling of hiding and showing elements when the step changes
   * @param direction foward or backwards
   */
  stepper(direction: stepDirection) {
    if (direction === stepDirection.FOWARDS) {
      this.step++;
    } else if (direction === stepDirection.BACKWARDS) {
      this.step--;
    }

    if (this.step === 0) {
      // initial display
      this.videoThumbnailContainer.style.display = 'none';
      this.wmComp.watermarkInputs.style.height = '324px';
      this.wmComp.wmBtn.style.display = 'none';
    }

    if (this.step === 1) {
      // video is place
      this.wmComp.addWMBtn.style.pointerEvents = 'all';
      this.wmComp.addWMBtn.style.opacity = '1.0';
      this.ddVidContainer.style.display = 'none';
      this.videoThumbnailContainer.style.display = 'block';
    }

    if (this.step === 2) {
      // watermark is placed
      this.wmComp.watermarkInputs.style.pointerEvents = 'all';
      this.wmComp.watermarkInputs.style.opacity = '1.0';
      this.wmComp.addWMBtn.style.display = 'none';
      this.wmComp.wmBtn.style.display = 'block';
    }
  }

  // =============================================================================
  // BOUNDARY AND GUIDE LOGIC
  // =============================================================================

  /**
   * create the bounds of the video
   */
  updateVideoBoundary() {
    const boundingClientRect = this.masterContainer.getBoundingClientRect();

    this.bounds = {
      left: 0,
      top: 0,
      bottom: this.masterContainer.scrollHeight - 7,
      right: this.masterContainer.scrollWidth - 7,
    };
    // console.log('bounds', this.bounds);

    if (this.moveable != null) {
      this.moveable.bounds = this.bounds;
      this.moveable.updateRect();
    }
  }

  /**
   * updates the guidelines when the video zoom and post change
   */
  updateGuideline() {
    const masterBoundingRect = this.masterContainer.getBoundingClientRect();
    const vidBoundingRect = this.videoThumbnailContainer.getBoundingClientRect();

    // console.log('JAMES', vidBoundingRect);
    // console.log('JAMES2', masterBoundingRect);
    this.moveable.verticalGuidelines = [
      vidBoundingRect.left - masterBoundingRect.left, // left
      vidBoundingRect.left - masterBoundingRect.left + vidBoundingRect.width, // right
      vidBoundingRect.left -
        masterBoundingRect.left +
        vidBoundingRect.width / 2, // center
    ];

    this.moveable.horizontalGuidelines = [
      vidBoundingRect.top - masterBoundingRect.top, // top
      vidBoundingRect.top - masterBoundingRect.top + vidBoundingRect.height, // bottom
      vidBoundingRect.top - masterBoundingRect.top + vidBoundingRect.height / 2, // center
    ];

    /* console.log(
      'this.moveable.verticalGuidelines',
      this.moveable.verticalGuidelines
    );

    console.log(
      'this.moveable.horizontalGuidelines',
      this.moveable.horizontalGuidelines
    ); */
  }
}
