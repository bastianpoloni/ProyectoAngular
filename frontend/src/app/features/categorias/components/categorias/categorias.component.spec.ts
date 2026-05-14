import { TestBed } from '@angular/core/testing';

import { CategoriesComponent } from './categorias.component';

describe('CategoriesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CategoriesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
