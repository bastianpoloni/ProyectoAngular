import { TestBed } from '@angular/core/testing';

import { DetailComponent } from './detalle.component';

describe('DetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DetailComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
