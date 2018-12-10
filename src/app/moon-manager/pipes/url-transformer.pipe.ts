import { Pipe, PipeTransform } from '@angular/core';
import { MediasBufferService } from '../services/medias-buffer.service';

@Pipe({
  name: 'urlTransformer'
})
export class UrlTransformerPipe implements PipeTransform {
  constructor(private medias: MediasBufferService) {}

  async transform(value: any, args?: any) {
    // let matches = value.match(/moon-manager:\/\//);
    let matches = value.match(/\/cache\/moon-manager\//);
    if (matches) {
      return await this.medias.getDataUrlMedia(value);
    }
    return value;
  }
}
