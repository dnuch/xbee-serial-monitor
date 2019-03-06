import { TestBed } from '@angular/core/testing';

import { NetworkconfigService } from './networkconfig.service';

describe('NetworkconfigService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NetworkconfigService = TestBed.get(NetworkconfigService);
    expect(service).toBeTruthy();
  });
});
