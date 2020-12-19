import { TestBed } from '@angular/core/testing';

import { WatermarkerService } from './watermarker.service';

describe('WatermarkerService', () => {
  let service: WatermarkerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WatermarkerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
