import { Component } from '@angular/core';

@Component({
  selector: 'app-main-container',
  templateUrl: 'main-container.component.html',
})
export class MainContainerComponent {
  isMonitoring = false;
  isGraph = false;
  isLocalization = false;

  constructor() {
    this.setIsMonitoring();
  }

  setIsMonitoring() {
    this.isMonitoring = true;
    this.isGraph = false;
    this.isLocalization = false;
  }

  setIsGraph() {
    this.isMonitoring = false;
    this.isGraph = true;
    this.isLocalization = false;
  }

  setIsLocalization() {
    this.isMonitoring = false;
    this.isGraph = false;
    this.isLocalization = true;
  }

}
