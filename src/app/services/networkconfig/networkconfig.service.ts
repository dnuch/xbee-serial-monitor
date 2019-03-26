import { Injectable, NgZone } from '@angular/core';
import { ElectronService } from '../electron/electron.service';
import { DataloggerService } from '../datalogger/datalogger.service';

// globally shared service
@Injectable({
  providedIn: 'root'
})
export class NetworkconfigService {

  readonly coordinatorAddress = '0013a20041819b8c'; // main network
  //readonly coordinatorAddress = '0013a2004182d155'; // danny's network

  // packet types sent to coordinator
  readonly startRangingType           = 0x09;
  readonly finishRangingType          = 0x07;
  readonly startMovingNodeRangingType = 0x0A;
  readonly readSensorDataType         = 0x08;

  // xbee constants
  public C: any;
  // connected serial port
  public port: any;
  // SerialPort API
  public serialPort: any;
  // xbee-api API
  public xbeeAPI: any;

  readonly portOpts = {
    baudRate: 38400,
    autoOpen: false
  };

  constructor(public electronService: ElectronService,
              public dataLoggerService: DataloggerService,
              public zone: NgZone) {
    this.C = this.electronService.xbee_api.constants;
    this.serialPort = this.electronService.serialPort;
    this.xbeeAPI = this.electronService.xbee_api;

    this.initXbeeAPI();
  }

  writeFrameObject(frameType: number) {
    const frameObject = {
      type: this.C.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST,
      // original
      destination64: this.coordinatorAddress,
      data: [frameType]
    };

    this.xbeeAPI.builder.write(frameObject);

    this.dataLoggerService.consoleTextArray
      .push(`>> ${new Date().toTimeString().slice(0, 8)} Node 0: ${frameType}`);
  }

  writeATCommand(atType: string) {
    const frameObject = {
      type: this.C.FRAME_TYPE.AT_COMMAND,
      // original
      destination64: this.coordinatorAddress,
      command: atType,
      commandParameter: []
    };

    this.xbeeAPI.builder.write(frameObject);

    this.dataLoggerService.consoleTextArray
      .push(`>> ${new Date().toTimeString().slice(0, 8)} Observer: AT${atType}`);
  }

  xbeeATCommandRead() {
    this.writeATCommand('ID');
    this.writeATCommand('SH');
    this.writeATCommand('SL');
  }

  initXbeeAPI() {
    this.xbeeAPI = new this.electronService.xbee_api.XBeeAPI({
      api_mode: 2,
      parser_buffer_size: 128
    });

    this.xbeeAPI.parser.on('data', frame => {
      console.log('<<', frame);
      this.zone.run(() => {
        if (typeof frame.data === 'object') {
          this.dataLoggerService.parsePacket(frame);
        } else if (typeof frame.command === 'string') {
          this.dataLoggerService.parseATCommand(frame);
        }
      });
    });

    this.C = this.electronService.xbee_api.constants;
    console.log(this.C);
  }

  initConnectedPort(portId: string) {
    return new Promise<any>((resolve, reject) => {
      this.port = new this.serialPort(
        portId,
        this.portOpts,
        err => {
          if (err) {
            return console.log('[ERR] Error opening port: ', err.message);
          }
        }
      );

      this.port.on('open', () => {
        console.log('[LOG] Port opened: ', portId);
      });

      this.port.on('error', err => {
        if (err) {
          console.log('[ERR] Error: ', err.message);
        }
      });

      this.port.open(err => {
        if (err) {
          console.log('[ERR] Error opening port: ', portId);
          reject(err);
        } else {
          this.port.pipe(this.xbeeAPI.parser);
          this.xbeeAPI.builder.pipe(this.port);
          resolve();
        }
      });
    });
  }

  closePort() {
    if (this.port) {
      this.port.close(err => {
        if (err) {
          console.log('[ERR] Error: ', err.message);
        }
      });
      this.port = null;
    }
  }
}
