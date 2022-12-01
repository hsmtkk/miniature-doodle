// Copyright (c) HashiCorp, Inc
// SPDX-License-Identifier: MPL-2.0
import { Construct } from "constructs";
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace } from "cdktf";
import * as google from '@cdktf/provider-google';

const project = 'miniature-doodle';
const region = 'asia-northeast1';
const repository = 'miniature-doodle';

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new google.provider.GoogleProvider(this, 'google', {
      project,
      region,
    });

    new google.cloudbuildTrigger.CloudbuildTrigger(this, 'cloud_build_trigger', {
      filename: 'cloudbuild.yaml',
      github: {
        owner: 'hsmtkk',
        name: repository,
        push: {
          branch: 'main',
        },
      },
    });

    new google.artifactRegistryRepository.ArtifactRegistryRepository(this, 'artifact_registry', {
      format: 'docker',
      location: region,
      repositoryId: 'registry',
    });

    const service_account = new google.serviceAccount.ServiceAccount(this, 'service_account', {
      accountId: 'runner',
      displayName: 'service account for this application',
    });

    const cloud_run_service = new google.cloudRunService.CloudRunService(this, 'cloud_run_service', {
      autogenerateRevisionName: true,
      location: region,
      name: 'example',
      template: {
        spec: {
          containers: [{
            image: 'us-docker.pkg.dev/cloudrun/container/hello',
          }],
          serviceAccountName: service_account.email,
        },
      },
    });

    const policy_data = new google.dataGoogleIamPolicy.DataGoogleIamPolicy(this, 'policy_data', {
      binding: [{
        role: 'roles/run.invoker',
        members: ['allUsers'],
      }],
    });

    new google.cloudRunServiceIamPolicy.CloudRunServiceIamPolicy(this, 'cloud_run_service_policy', {
      location: region,
      policyData: policy_data.policyData,
      service: cloud_run_service.name,
    });

  }
}

const app = new App();
const stack = new MyStack(app, "miniature-doodle");
new CloudBackend(stack, {
  hostname: "app.terraform.io",
  organization: "hsmtkkdefault",
  workspaces: new NamedCloudWorkspace("miniature-doodle")
});
app.synth();
