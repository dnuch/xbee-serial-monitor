import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';

import { ElectronService } from './services/electron/electron.service';
import { NetworkconfigService } from './services/networkconfig/networkconfig.service';
import { DataloggerService } from './services/datalogger/datalogger.service';

import { MainContainerComponent } from './containers/main-container/main-container.component';
import { SerialMonitorComponent } from './components/serialmonitor/serialmonitor.component';

@NgModule({
  declarations: [
    AppComponent,
    MainContainerComponent,
    SerialMonitorComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [
    ElectronService,
    NetworkconfigService,
    DataloggerService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
