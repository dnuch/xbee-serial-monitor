import { Component, OnDestroy, OnInit } from '@angular/core';

import { NetworkconfigService } from '../../services/networkconfig/networkconfig.service';
import { Angular5Csv } from 'angular5-csv/dist/Angular5-csv';

declare interface dataRow {
  id?: number;
  comName?: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
}

declare interface TableData {
  headerRow: string[];
  dataRows: dataRow[];
}

@Component({
  selector: 'app-serialmonitor',
  templateUrl: 'serialmonitor.component.html',
  styleUrls: ['./serialmonitor.component.css']
})
export class SerialMonitorComponent implements OnInit, OnDestroy {
  constructor(public network: NetworkconfigService) { }

  public tableData: TableData;
  public selectedPortId: string;
  public isSerialConnected: boolean = false;

  ngOnInit() {
    this.tableData = {
      headerRow: ['#', 'COM name', 'Manuf.', 'Vendor ID', 'Product ID'],
      dataRows: [],
    };
  }

  ngOnDestroy() {
    this.network.closePort();
  }

  scan() {
    this.selectedPortId = '';
    let index = 1;
    let portDetails: any;
    this.tableData.dataRows = []; // clear
    this.network.serialPort.list().then(ports => {
      console.log('[LOG] List of ports: ', ports);
      ports.forEach(port => {
        portDetails = {
          id: index,
          comName: port.comName,
          manufacturer: port.manufacturer,
          vendorId: port.vendorId,
          productId: port.productId,
        };
        this.tableData.dataRows.push(portDetails);
        index++;
      });
    });
  }

  getPort($event) {
    console.log('[LOG] Selected port ID: ', $event.target.textContent);
    this.selectedPortId = $event.target.textContent;
    this.tableData.dataRows = this.tableData.dataRows.filter(
      element => element.comName === this.selectedPortId
    );
  }

  openPort() {
    this.network.initConnectedPort(this.selectedPortId)
      .then(() => {
        console.log('Connection Successful');
        this.isSerialConnected = true;
      });
  }

  sendPacket(packetType: number) {
    this.network.writeFrameObject(packetType);
  }

  closePort() {
    this.network.closePort();
    console.log('[LOG] Port closed: ', this.selectedPortId);
    this.selectedPortId = null;
    this.isSerialConnected = false;
    this.network.dataLoggerService.emptyConsoleArray();
    this.network.dataLoggerService.emptyCSVData();
    this.scan();
  }

  getCSV(data: any, fileName: string) {
    new Angular5Csv(data, fileName);
  }
}
