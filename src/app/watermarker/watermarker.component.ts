import {
  Component,
  OnInit,
  ViewChild,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { MasterViewComponent } from './master-view/master-view.component';
import { MatSidenav } from '@angular/material/sidenav';
import { ResizeObserver } from 'resize-observer';
import { WatermarkerService } from './watermark-service/watermarker.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ResultsDialogComponent } from './results-dialog/results-dialog.component';

enum stepDirection {
  BACKWARDS,
  FOWARDS,
  NONE,
}

@Component({
  selector: 'app-watermarker',
  templateUrl: './watermarker.component.html',
  styleUrls: ['./watermarker.component.scss'],
})
export class WatermarkerComponent implements OnInit, AfterViewInit {
  // varibles that faciliate the sidebar inputs
  public lockState = 'lock'; // ratio lock button value
  public zoom = '100%'; // zoom value
  public oldW = 0; // helper for ratio
  public oldH = 0; // helper for ratio
  public wmRatioSet = false; // boolean for seeing if the intial ratio was created
  public ratioW = 0;
  public ratioH = 0;

  public oldX = 0;
  public oldY = 0;

  // varibles to help facilitate zooming
  vidThumbnailOriginalW: string = null;
  vidThumbnailOriginalH: string = null;

  // containers
  public watermarkInputs;
  public addWMBtn;
  public wmBtn;
  public xPosInput;
  public yPosInput;
  public inputW;
  public inputH;
  public drawer;
  public sidenavToggle;

  // child component of master view so we can access those vars
  @ViewChild('masterView') MasterView: MasterViewComponent;
  @ViewChild('drawer') public sidenav: MatSidenav;

  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(
      map((result) => result.matches),
      shareReplay()
    );

  // ===========================================================================
  // CONSTRUCTOR AND INITs
  // ===========================================================================

  constructor(
    private breakpointObserver: BreakpointObserver,
    public watermarkerService: WatermarkerService,
    private matDialog: MatDialog
  ) {

    console.log('RES', watermarkerService.getFlaskExample());
  }

  ngOnInit() {
    this.initContainers();
  }

  ngAfterViewInit(): void {
    this.handleSideNavBasedOnDevice();
 
  }

  initContainers() {
    this.watermarkInputs = document.getElementById(
      'watermarkInputs'
    ) as HTMLCollectionOf<HTMLElement>[0];

    this.addWMBtn = document.getElementById('addWMBtn') as HTMLCollectionOf<
      HTMLElement
    >[0];

    this.wmBtn = document.getElementById('wmBtn') as HTMLCollectionOf<
      HTMLElement
    >[0];

    this.xPosInput = document.getElementById('X_pos') as HTMLCollectionOf<
      HTMLElement
    >[0];
    this.yPosInput = document.getElementById('Y_pos') as HTMLCollectionOf<
      HTMLElement
    >[0];

    this.inputW = document.getElementById('widthInput') as HTMLCollectionOf<
      HTMLElement
    >[0];

    this.inputH = document.getElementById('heightInput') as HTMLCollectionOf<
      HTMLElement
    >[0];

    this.drawer = document.getElementById('drawer') as HTMLCollectionOf<
      HTMLElement
    >[0];

    this.sidenavToggle = document.getElementById(
      'sidenavToggle'
    ) as HTMLCollectionOf<HTMLElement>[0];
  }

  // ===========================================================================
  //  API CALLS
  // ===========================================================================
  watermarkOnServer() {
    const fileMetadata = {
      IWatermaker: {
        files: [
          {
            fileName: this.MasterView.videoFile.name,
            fileType: this.MasterView.videoFile.name.substr(
              this.MasterView.videoFile.name.lastIndexOf('.') + 1
            ),
            fileSize: '1000',
            isBaseFile: true,
            width: '1080',
            height: '1920',
            x: '',
            y: '',
            r: '',
          },
          {
            fileName: this.MasterView.imgFile.name,
            fileType: this.MasterView.imgFile.name.substr(
              this.MasterView.imgFile.name.lastIndexOf('.') + 1
            ),
            fileSize: '10000',
            isBaseFile: false,
            width: this.getW().toString(),
            height: this.getH().toString(),
            x: (this.getX() - this.getOffsetWH().oW / 2).toString(),
            y: (this.getY() - this.getOffsetWH().oH / 2).toString(),
            r: this.getRotate().toString(),
          },
        ],
      },
    };

    const dialogConfig = {
      height: '400px',
      width: '500px',
      disableClose: true,
      panelClass: 'dialogBackground',
      data: {
        fileData: fileMetadata,
        files: [this.MasterView.videoFile, this.MasterView.imgFile],
      },
    };
    this.matDialog.open(ResultsDialogComponent, dialogConfig);
  }

  // ===========================================================================
  // Sidenav should and hide logic
  // ===========================================================================

  toggleSideNav() {
    // current values beofre zoom
    this.sidenav.toggle();
  }

  handleSideNavBasedOnDevice() {


    if (window.innerWidth < 700 || window.innerHeight < 500) {
      this.sidenavToggle.style.display = 'block';
      this.sidenav.close();
      this.sidenav.mode = 'over';
    } else {
      this.sidenavToggle.style.display = 'none';
      this.sidenav.open();
      this.sidenav.mode = 'side';
    }

    if (this.sidenav.mode === 'over') {
      console.log(document.querySelector('.ruler.vertical')); //.style.cssText = "--my-var: #000";
      document.querySelector<HTMLElement>('.ruler.vertical').style.left = '0px';

    } else if (this.sidenav.mode === 'side') {
      console.log("ABC", document.querySelector('.ruler.vertical')); //.style.cssText = "--my-var: #000";
      document.querySelector<HTMLElement>('.ruler.vertical').style.left = '300px';
    }

  }

  // ===========================================================================
  // Window resize listener
  // ===========================================================================

  @HostListener('window:resize', ['$event'])
  onWindowResize(event) {
    this.handleSideNavBasedOnDevice();
    this.windowResizeMaintainPos();
  }

  /**
   * helper function when window changes size it should stay in the same spot realitively
   */
  windowResizeMaintainPos() {
    const currX = this.xPosInput.value;
    const currY = this.yPosInput.value;
    const currW = this.getW();
    const currH = this.getH();

    // it only works when u call it twice...
    this.setCoords(Number(currX), Number(currY), currW, currH, true, true);
    this.setCoords(Number(currX), Number(currY), currW, currH, true, true);
  }

  // ===========================================================================
  // Functionality when a user needs to create the watermark image
  // ===========================================================================

  /**
   * called by the button when the user pics the image and reads the image
   * @param event event
   */
  createWatermark(event: Event) {
    this.MasterView.generateMovableObject();
    this.MasterView.readImageURL(event);
    this.MasterView.stepper(stepDirection.FOWARDS);
  }

  // =============================================================================
  // Setters - x, y, w, h, and rotate all called when any input changes
  // =============================================================================

  /**
   * sets the position of the watermark whenever any input changes
   * @param x  x
   * @param y  y
   * @param w  width
   * @param h  hieght
   * @param setWH bool whether width and height should be changed
   * @param setXY bool whether X and Y should be changed
   */
  setCoords(x, y, w, h, setWH, setXY) {
    const tar = this.MasterView.wmContainer;
    const mults = this.MasterView.getRulerMultipliers();

    // real x in comparison to master view
    let rX =
      (Math.abs(mults.hRulerShift) - this.getW() / 2 + Number(x)) *
      mults.hRulerMult;

    // real y in comparison to master view
    let rY =
      (Math.abs(mults.vRulerShift) - this.getH() / 2 + Number(y)) *
      mults.vRulerMult;

    // real width, height in comparison to master view
    let rW = w * mults.hRulerMult;
    let rH = h * mults.vRulerMult;

    if (rW <= 50 || rH <= 50) {
      // rW = 50;
      this.inputW.setAttribute('min', w.toString());

      // rH = 50;
      this.inputH.setAttribute('min', h.toString());
    }

    // sets a minimum the X input value can be
    if (rX <= 0) {
      rX = 0;
      this.xPosInput.setAttribute('min', x.toString());
    }

    // sets a maximum the X input value can be
    if (rX >= this.MasterView.moveable.bounds.right - rW) {
      rX = this.MasterView.moveable.bounds.right - rW;
      this.xPosInput.setAttribute('max', this.getX());
    }

    // sets a minimum the Y input can be
    if (rY <= 0) {
      rY = 0;
      this.yPosInput.setAttribute('min', y.toString());
    }

    // sets a max the Y input value can be
    if (rY >= this.MasterView.moveable.bounds.bottom - rH) {
      rY = this.MasterView.moveable.bounds.bottom - rH;
      this.yPosInput.setAttribute('max', this.getY());
    }

    // xy should only change in certain situations
    if (setXY === true) {
      tar.style.transform = `translate(${rX}px, ${rY}px) rotate(${this.MasterView.frame.rotate}deg)`;
      this.MasterView.frame.translate = [Number(rX), Number(rY)];
    }

    // wh should only change in certain situations
    if (setWH === true) {
      // logic for the ratio lock state
      if (this.lockState === 'lock') {
        if (Number(this.oldW) !== Number(w)) {
          tar.style.width = `${rW}px`;
          tar.style.height = `${rW * this.generateRatio().rW}px`;
        } else if (Number(this.oldH) !== Number(h)) {
          tar.style.width = `${rH * this.generateRatio().rH}px`;
          tar.style.height = `${rH}px`;
        }
      } else {
        tar.style.width = `${rW}px`;
        tar.style.height = `${rH}px`;
      }
    }

    // Update the wm
    this.MasterView.moveable.updateRect();
  }

  /**
   * helper function when ratio is locked, helps determine ratio
   */
  generateRatio() {
    if (this.wmRatioSet === false) {
      this.ratioW = this.oldH / this.oldW;
      this.ratioH = this.oldW / this.oldH;

      this.wmRatioSet = true;
    }

    console.log(this.ratioH);
    return {
      rW: this.ratioW,
      rH: this.ratioH,
    };
  }

  /**
   * function to set the rotation of the watermark when the input changes
   * @param r rotate
   */
  setRotate(r) {
    const tar = this.MasterView.wmContainer;

    tar.style.transform = `translate(${this.MasterView.frame.translate[0]}px, ${this.MasterView.frame.translate[1]}px) rotate(${r}deg)`;

    this.MasterView.frame.rotate = Number(r);
    this.MasterView.moveable.updateRect();

    console.log(r);
  }

  // ========================================================================================
  // Getter - when the user moves or changes the watermark, these functions update the inputs
  // ========================================================================================

  /**
   * get the rotation amount
   */
  getRotate() {
    if (this.MasterView !== undefined) {
      return this.MasterView.frame.rotate; // + '°';
    } else {
      return 0; // + '°';
    }
  }

  /**
   * get the x position
   */
  getX() {
    if (this.MasterView !== undefined) {
      return this.MasterView.getRelativeXY().x;
    } else {
      return 0;
    }
  }

  /**
   * get the Y position
   */
  getY() {
    if (this.MasterView !== undefined) {
      return this.MasterView.getRelativeXY().y;
    } else {
      return 0;
    }
  }

  /**
   * get the width of the watermark
   */
  getW() {
    if (this.MasterView !== undefined) {
      this.oldW = this.MasterView.getRelativeWH().w;

      return this.MasterView.getRelativeWH().w;
    } else {
      return 0;
    }
  }

  /**
   * get the height of the watermark
   */
  getH() {
    if (this.MasterView !== undefined) {
      this.oldH = this.MasterView.getRelativeWH().h;

      return this.MasterView.getRelativeWH().h;
    } else {
      return 0;
    }
  }

  getOffsetWH() {
    const wmBoundingRect = this.MasterView.wmContainer.getBoundingClientRect();
    const ow =
      wmBoundingRect.width / this.MasterView.getRulerMultipliers().hRulerMult;
    const oh =
      wmBoundingRect.height / this.MasterView.getRulerMultipliers().vRulerMult;

    return {
      oW: Math.round(Math.abs(ow)),
      oH: Math.round(Math.abs(oh)),
    };
  }

  // ===========================================================================
  // Zoom and ratio functions
  // ===========================================================================

  /**
   * button to make the w and h lockable and unlockable
   */
  lockUnlockWMRatio() {
    this.wmRatioSet = false;

    if (this.lockState === 'lock') {
      this.lockState = 'lock_open';
    } else {
      this.lockState = 'lock';
    }

    if (this.MasterView.moveable.keepRatio === false) {
      this.MasterView.moveable.keepRatio = true;
      this.lockState = 'lock';
    } else {
      this.MasterView.moveable.keepRatio = false;
      this.lockState = 'lock_open';
    }
  }

  /**
   * function to set the video back to 100%, called by button in the sidebar
   */
  equalize() {
    this.MasterView.videoThumbnailContainer.style.width = this.vidThumbnailOriginalW;
    this.MasterView.videoThumbnailContainer.style.height = this.vidThumbnailOriginalH;
    this.zoom = '100%';
    this.MasterView.updateRulers();
    this.MasterView.updateGuideline();
  }

  /**
   * handles zooming out and updating the html elements
   */
  zoomOut() {
    let zoomNum: number = +this.zoom.slice(0, -1);
    // dont zoom less than 50%
    if (zoomNum <= 50) {
      zoomNum = 50;
    } else {
      zoomNum -= 10;
    }

    // only update if a video is already present
    if (
      this.MasterView.videoThumbnailContainer.style.width !== '0px' &&
      this.vidThumbnailOriginalW === null
    ) {
      this.vidThumbnailOriginalW = this.MasterView.videoThumbnailContainer.style.width;
      this.vidThumbnailOriginalH = this.MasterView.videoThumbnailContainer.style.height;
    }

    // current values beofre zoom
    const currX = this.xPosInput.value;
    const currY = this.yPosInput.value;
    const currW = this.getW();
    const currH = this.getH();

    // update css
    this.MasterView.videoThumbnailContainer.style.width =
      +this.vidThumbnailOriginalW.slice(0, -2) * (zoomNum * 0.01) + 'px';

    // update css
    this.MasterView.videoThumbnailContainer.style.height =
      +this.vidThumbnailOriginalH.slice(0, -2) * (zoomNum * 0.01) + 'px';

    this.zoom = zoomNum + '%';

    this.MasterView.updateRulers();
    this.MasterView.updateVideoBoundary();
    this.MasterView.updateGuideline();

    // it only works when u call it twice...
    this.setCoords(Number(currX), Number(currY), currW, currH, true, true);
    this.setCoords(Number(currX), Number(currY), currW, currH, true, true);
  }

  /**
   * handles zooming in and updating the html elements
   */
  zoomIn() {
    let zoomNum: number = +this.zoom.slice(0, -1);
    // zoom should not go past 200%
    if (zoomNum >= 200) {
      zoomNum = 200;
    } else {
      zoomNum += 10;
    }

    // make sure a video exists
    if (
      this.MasterView.videoThumbnailContainer.style.width !== '0px' &&
      this.vidThumbnailOriginalW === null
    ) {
      this.vidThumbnailOriginalW = this.MasterView.videoThumbnailContainer.style.width;
      this.vidThumbnailOriginalH = this.MasterView.videoThumbnailContainer.style.height;
    }

    // current values beofre zoom
    const currX = this.xPosInput.value;
    const currY = this.yPosInput.value;
    const currW = this.getW();
    const currH = this.getH();

    // update css
    this.MasterView.videoThumbnailContainer.style.width =
      +this.vidThumbnailOriginalW.slice(0, -2) * (zoomNum * 0.01) + 'px';

    this.MasterView.videoThumbnailContainer.style.height =
      +this.vidThumbnailOriginalH.slice(0, -2) * (zoomNum * 0.01) + 'px';

    this.zoom = zoomNum + '%';

    this.MasterView.updateRulers();
    this.MasterView.updateVideoBoundary();
    this.MasterView.updateGuideline();

    // it only works when u call it twice...
    this.setCoords(Number(currX), Number(currY), currW, currH, true, true);
    this.setCoords(Number(currX), Number(currY), currW, currH, true, true);
  }

  // ===========================================================================
  // Stepper logic
  // ===========================================================================
}
