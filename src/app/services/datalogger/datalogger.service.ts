import { Injectable, OnInit } from '@angular/core';

declare interface aliveRow {
  MAC: string;
  numOfReadings: number;
  rcvTimestamp: number;
}

declare interface rangingRow {
  anchorID: number;
  tagID: number;
  rangingData: number;
  rcvTimestamp: number;
}

declare interface sensorRow {
  MAC: string;
  timestamp: number;
  temperatureValue: number;
  lightValue: number;
  rcvTimestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataloggerService implements OnInit {

  public consoleTextArray: Array<string> = [];
  public sensorData: Array<sensorRow> = [];
  public aliveData: Array<aliveRow> = [];
  public rangingData: Array<rangingRow> = [];

  readonly PACKET_TYPE_OFFSET = 0;

  // time is 2 bytes => seconds; 2^16 seconds = 0.7585 days
  readonly SENSOR_TIMESTAMP_OFFSET = 2;
  readonly SENSOR_TIME_OFFSET = 4;
  // temperature is float
  readonly SENSOR_TEMPERATURE_OFFSET = 6;
  // light is float
  readonly SENSOR_LIGHT_OFFSET = 10;

  // two byte value count of number of readings
  readonly ALIVE_NUM_OF_READINGS_OFFSET = 1;

  // ranging data is 9 bytes -xxx.xxxx
  readonly COORD_RANGE_ANCHOR_OFFSET = 1;
  readonly COORD_RANGE_TAG_OFFSET = 2;
  readonly COORD_RANGE_DATA_OFFSET = 3;

  // from sensing nodes
  readonly SENSOR_TYPE = 0x06;
  readonly NODE_ALIVE_TYPE = 0xA5;
  // from coordinator
  readonly COORD_RANGE_RECEIVED_TYPE = 0xA6;

  constructor() { }

  ngOnInit() {
    this.emptyCSVData();
    this.emptyConsoleArray();
  }

  emptyConsoleArray() {
    this.consoleTextArray = [];
  }

  emptyCSVData() {
    this.aliveData = [];
    this.rangingData = [];
    this.sensorData = [];
  }

  parsePacket(frame: any) {
    switch (frame.data[this.PACKET_TYPE_OFFSET]) {
      case this.SENSOR_TYPE:
        //const sAsciiPacket = String.fromCharCode.apply(null, frame.data);
        const getTimestamp = (frame.data[this.SENSOR_TIMESTAMP_OFFSET + 1] << 8) |
                             frame.data[this.SENSOR_TIMESTAMP_OFFSET];
        const getTemperatureValue = this.float32ToNumber(
          (frame.data[this.SENSOR_TEMPERATURE_OFFSET + 3] << 24) |
          (frame.data[this.SENSOR_TEMPERATURE_OFFSET + 2] << 16) |
          (frame.data[this.SENSOR_TEMPERATURE_OFFSET + 1] << 8) |
          frame.data[this.SENSOR_TEMPERATURE_OFFSET]
        );

        const getLightValue = this.float32ToNumber(
          (frame.data[this.SENSOR_LIGHT_OFFSET + 3] << 24) |
          (frame.data[this.SENSOR_LIGHT_OFFSET + 2] << 16) |
          (frame.data[this.SENSOR_LIGHT_OFFSET + 1] << 8) |
          frame.data[this.SENSOR_LIGHT_OFFSET]
        );
        const sDate = new Date();
        const sRow: sensorRow = {
          MAC:              frame.remote64,
          timestamp:        getTimestamp,
          temperatureValue: getTemperatureValue,
          lightValue:       getLightValue,
          rcvTimestamp:     sDate.getTime()
        };

        console.log(sRow);
        this.consoleTextArray
          .push(`<< ${sDate.toTimeString().slice(0, 8)} ${frame.remote64}: Timestamp: ${
            getTimestamp}, Temperature: ${getTemperatureValue}, Light: ${getLightValue}`);
        this.sensorData.push(sRow);
        break;
      case this.NODE_ALIVE_TYPE:
        // const aAsciiPacket = String.fromCharCode.apply(null, frame.data);
        const getNumReadings = (frame.data[this.ALIVE_NUM_OF_READINGS_OFFSET + 1] << 8) |
                               frame.data[this.ALIVE_NUM_OF_READINGS_OFFSET];

        const aDate = new Date();
        const aRow: aliveRow = {
          MAC:           frame.remote64,
          numOfReadings: getNumReadings,
          rcvTimestamp:  aDate.getTime()
        };

        console.log(aRow);
        this.consoleTextArray
          .push(`<< ${aDate.toTimeString().slice(0, 8)} ${frame.remote64}: *ALIVE* Readings: ${getNumReadings}`);
        this.aliveData.push(aRow);
        break;
      case this.COORD_RANGE_RECEIVED_TYPE:
        const rAsciiPacket = String.fromCharCode.apply(null, frame.data);
        const getAnchorID = rAsciiPacket.slice(this.COORD_RANGE_ANCHOR_OFFSET, this.COORD_RANGE_TAG_OFFSET);
        const getTagID = rAsciiPacket.slice(this.COORD_RANGE_TAG_OFFSET, this.COORD_RANGE_DATA_OFFSET);
        const getRangingData = rAsciiPacket.slice(this.COORD_RANGE_DATA_OFFSET, this.COORD_RANGE_DATA_OFFSET + 9);

        const rDate = new Date();
        const rRow: rangingRow = {
          anchorID:     getAnchorID - 0,
          tagID:        getTagID - 0,
          rangingData:  getRangingData - 0,
          rcvTimestamp: rDate.getTime()
        };

        console.log(rRow);
        this.consoleTextArray
          .push(`<< ${rDate.toTimeString().slice(0, 8)} ${frame.remote64}: ${getAnchorID}<->${getTagID}: ${getRangingData}`);
        this.rangingData.push(rRow);
        break;
      default:
    }
  }

  float32ToNumber(bits: number): number {
    let sign = ((bits >>> 31) == 0) ? 1.0 : -1.0;
    let e = ((bits >>> 23) & 0xff);
    let m = (e == 0) ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
    return Math.round((sign * m * Math.pow(2, e - 150)) * 1000000) / 1000000;
  }
}
