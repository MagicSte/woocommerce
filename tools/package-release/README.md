# How to release Javascript packages

When a packages contains sufficient changes to justify a release to [NPM](https://www.npmjs.com/), follow these instructions to create a new release from the monorepo.

## Prepare packages for release

In order to prepare a package for release, version numbers require a bump to signify a new version as well as compilation of the changelog. The monorepo [Actions Tab contains a Prepare Package Release workflow](https://github.com/woocommerce/woocommerce/actions/workflows/prepare-package-release.yml).

1. Click the "Run workflow" button.

![image](https://user-images.githubusercontent.com/1922453/179434424-f08af974-5597-4c6f-955b-43faf062c7a7.png)

2. Select the branch you'd like to release from. Typically, this would be `trunk`. You can also choose wich packages to prepare for release by supplying them as comma separated values in the input box. To loop through all packages, simply leave the `-a` flag. Packages that don't have any changes will be skipped and left as is.

![image](https://user-images.githubusercontent.com/1922453/179434508-8f44fcca-0f01-47f2-8b9e-f5ef5ff3a577.png)

3. Once the action has finished, check [open pull requests](https://github.com/woocommerce/woocommerce/pulls) for a pull request generated by Github Actions Bot. This pull request should include version bumps and changelog changes for applicable packages. Approve and merge the pull request once checks pass.

4. Release the packages to NPM by kicking off another workflow. The [Packages Release workflow](https://github.com/woocommerce/woocommerce/actions/workflows/package-release.yml) has the same inputs as the prepare workflow. Be sure to release from the same branch and select the same packages to release.

![image](https://user-images.githubusercontent.com/1922453/179435048-ad2cd168-55b1-471a-b05f-3aed4a9e499b.png)

5. Confirm the package has been updated by visiting NPM. For example see https://www.npmjs.com/package/@woocommerce/components.