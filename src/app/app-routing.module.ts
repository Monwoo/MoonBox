import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { environment } from '@env/environment';

const routes: Routes = [
  // Fallback when no prior route is matched
  // https://stackoverflow.com/questions/43488480/exclude-specific-path-from-routing-in-angular-2
  // path: '**', // => TODO : find solution for transparent routes or missing some expected design pattern ?
  // { path: '**', redirectTo: '', pathMatch: 'full' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(
      routes,
      // https://medium.com/@astamataris/setting-up-routing-in-a-multi-module-angular-4-app-using-the-router-module-d8e610196443
      { enableTracing: environment.production } // <-- debugging purposes only
    )
  ],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule {}
