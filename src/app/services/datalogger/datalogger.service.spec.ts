import { TestBed } from '@angular/core/testing';

import { DataloggerService } from './datalogger.service';

describe('DataloggerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DataloggerService = TestBed.get(DataloggerService);
    expect(service).toBeTruthy();
  });
});
