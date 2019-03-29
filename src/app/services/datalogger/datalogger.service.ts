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

declare interface aliveTableRow {
  ID: number;
  numOfReadings: number;
  rcvTime: string;
}

declare interface rangingTableRow {
  anchorID: number;
  tagID: number;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataloggerService implements OnInit {

  // main sensor network
  readonly mappedMACtoID = {
    '0013a20041819b8c': 0, /* Coordinator A */
    '0013a2004151a94c': 1, /* Orange 1/A */
    '0013a2004151a942': 2, /* Orange 2/B */
    '0013a2004151a94a': 3, /* Orange 3/C */
    '0013a2004151a937': 4, /* Orange 4/D */
    '0013a2004151a93d': 5, /* Orange 5/E */
    '0013a2004151a94b': 6, /* Orange 6/F */
    '0013a2004151a93f': 7  /* Orange 7/G */
  };

  // danny's network
  // readonly mappedMACtoID = {
  //   '0013a2004182d155': 0, /* Coordinator */
  //   '0013a20041819b0d': 1, /* Node 1 */
  //   '0013a20041819bab': 2  /* Node 2 */
  // };

  public aliveTable = new Map<string, aliveTableRow>();
  public rangingTable = new Map<string, rangingTableRow>();

  public consoleTextArray: Array<string> = [];
  public sensorData: Array<sensorRow> = [];
  public aliveData: Array<aliveRow> = [];
  public rangingData: Array<rangingRow> = [];

  readonly PACKET_TYPE_OFFSET = 0;

  // n byte payload
  readonly SENSOR_DATA_SIZE_OFFSET = 3;
  // time is 2 bytes => seconds; 2^16 seconds = 0.7585 days
  readonly SENSOR_TIMESTAMP_OFFSET = 4;
  // temperature is float
  readonly SENSOR_TEMPERATURE_OFFSET = 6;
  // light is float
  readonly SENSOR_LIGHT_OFFSET = 10;
  // payload size is 10 bytes; timestamp (2), temperature (4), light (4)
  readonly SENSOR_PAYLOAD_SIZE = 10;

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
    this.emptyTableEntries();
  }

  emptyConsoleArray() {
    this.consoleTextArray = [];
  }

  emptyCSVData() {
    this.aliveData = [];
    this.rangingData = [];
    this.sensorData = [];
  }

  emptyTableEntries() {
    this.aliveTable.clear();
    this.rangingTable.clear();
  }

  parsePacket(frame: any) {
    switch (frame.data[this.PACKET_TYPE_OFFSET]) {
      case this.SENSOR_TYPE:
        const sDate = new Date();
        const getDataSize = frame.data[this.SENSOR_DATA_SIZE_OFFSET];

        this.consoleTextArray
          .push(`<< ${sDate.toTimeString().slice(0, 8)} Node ${this.mappedMACtoID[frame.remote64]
          } => Sensor Payload Size: ${getDataSize} bytes`);

        // timestamp (2 bytes), temperature (4 bytes), light (4 bytes)
        for (let i = 0; i < getDataSize / this.SENSOR_PAYLOAD_SIZE; i++) {
          const nextSensorPacketOffset = i * this.SENSOR_PAYLOAD_SIZE;
          const getTimestamp = (frame.data[this.SENSOR_TIMESTAMP_OFFSET + 1 + nextSensorPacketOffset] << 8) |
                               frame.data[this.SENSOR_TIMESTAMP_OFFSET + nextSensorPacketOffset];

          const getTemperatureValue = this.float32ToNumber(
            (frame.data[this.SENSOR_TEMPERATURE_OFFSET + 3 + nextSensorPacketOffset] << 24) |
            (frame.data[this.SENSOR_TEMPERATURE_OFFSET + 2 + nextSensorPacketOffset] << 16) |
            (frame.data[this.SENSOR_TEMPERATURE_OFFSET + 1 + nextSensorPacketOffset] << 8) |
            frame.data[this.SENSOR_TEMPERATURE_OFFSET + nextSensorPacketOffset]
          );

          const getLightValue = this.float32ToNumber(
            (frame.data[this.SENSOR_LIGHT_OFFSET + 3 + nextSensorPacketOffset] << 24) |
            (frame.data[this.SENSOR_LIGHT_OFFSET + 2 + nextSensorPacketOffset] << 16) |
            (frame.data[this.SENSOR_LIGHT_OFFSET + 1 + nextSensorPacketOffset] << 8) |
            frame.data[this.SENSOR_LIGHT_OFFSET + nextSensorPacketOffset]
          );

          const sRow: sensorRow = {
            MAC:              frame.remote64,
            timestamp:        getTimestamp,
            temperatureValue: getTemperatureValue,
            lightValue:       getLightValue,
            rcvTimestamp:     sDate.getTime()
          };

          this.consoleTextArray
            .push(`-> Timestamp: ${getTimestamp}, Temperature: ${getTemperatureValue}, Light: ${getLightValue}`);
          this.sensorData.push(sRow);
        }
        break;
      case this.NODE_ALIVE_TYPE:
        const getNumReadings = (frame.data[this.ALIVE_NUM_OF_READINGS_OFFSET + 1] << 8) |
                               frame.data[this.ALIVE_NUM_OF_READINGS_OFFSET];

        const aDate = new Date();
        const aRow: aliveRow = {
          MAC:           frame.remote64,
          numOfReadings: getNumReadings,
          rcvTimestamp:  aDate.getTime()
        };

        const mappedMACtoID = this.mappedMACtoID[frame.remote64];
        const timeString = aDate.toTimeString().slice(0, 8);

        this.consoleTextArray
          .push(`<< ${timeString} Node ${mappedMACtoID} => *ALIVE* Readings: ${getNumReadings}`);
        this.aliveData.push(aRow);

        if (this.aliveTable.has(mappedMACtoID)) {
          this.aliveTable.get(mappedMACtoID).numOfReadings = getNumReadings;
          this.aliveTable.get(mappedMACtoID).rcvTime = timeString;
        } else {
          this.aliveTable.set(mappedMACtoID, {
            ID:            mappedMACtoID,
            numOfReadings: getNumReadings,
            rcvTime:       timeString
          });
        }
        break;
      case this.COORD_RANGE_RECEIVED_TYPE:
        const rAsciiPacket = String.fromCharCode.apply(null, frame.data);
        const getAnchorID = rAsciiPacket.slice(this.COORD_RANGE_ANCHOR_OFFSET, this.COORD_RANGE_TAG_OFFSET);
        const getTagID = rAsciiPacket.slice(this.COORD_RANGE_TAG_OFFSET, this.COORD_RANGE_DATA_OFFSET);
        const getRangingData = rAsciiPacket.slice(this.COORD_RANGE_DATA_OFFSET, this.COORD_RANGE_DATA_OFFSET + 9);

        const rDate = new Date();
        const rRow: rangingRow = {
          anchorID:     getAnchorID.charCodeAt(0) - 48,
          tagID:        getTagID.charCodeAt(0) - 48,
          rangingData:  getRangingData - 0,
          rcvTimestamp: rDate.getTime()
        };

        console.log(rRow);
        this.consoleTextArray
          .push(`<< ${rDate.toTimeString().slice(0, 8)} Node ${this.mappedMACtoID[frame.remote64]
          } => ${rRow.anchorID}<->${rRow.tagID}: ${getRangingData}`);
        this.rangingData.push(rRow);

        if (this.rangingTable.has(getAnchorID + getTagID)) {
          this.rangingTable.get(getAnchorID + getTagID).count++;
        } else {
          this.rangingTable.set(getAnchorID + getTagID, {
            anchorID: rRow.anchorID,
            tagID:    rRow.tagID,
            count:    1
          });
        }
        break;
      default:
    }
  }

  parseATCommand(frame: any) {
    switch (frame.command) {
      case 'ID':
        this.consoleTextArray
          .push(`<< ${new Date().toTimeString().slice(0, 8)} Observer => PAN ID: ${this.buf2hex(frame.commandData)}`);
        break;
      case 'SH':
        this.consoleTextArray
          .push(`<< ${new Date().toTimeString().slice(0, 8)} Observer => MAC: ${this.buf2hex(frame.commandData)}`);
        break;
      case 'SL':
        this.consoleTextArray[this.consoleTextArray.length - 1] += this.buf2hex(frame.commandData);
        break;
      case 'ND':
        this.consoleTextArray
          .push(`<< ${new Date().toTimeString().slice(0, 8)} Observer => NODE found: ${frame.nodeIdentification.nodeIdentifier
            }, NODE ID: ${this.mappedMACtoID[frame.nodeIdentification.remote64]}`);
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

  buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  }
}
