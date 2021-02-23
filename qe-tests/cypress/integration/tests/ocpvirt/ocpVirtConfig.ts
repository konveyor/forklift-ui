import { LoginData, MappingData, PlanData, TestData, OcpVirtData } from '../../types/types';
import { storageType, vmware } from '../../types/constants';

const url = Cypress.env('url');
const user_login = 'kubeadmin';
const user_password = Cypress.env('pass');

export const loginData: LoginData = {
  username: user_login,
  password: user_password,
  url: url,
};

export const providerData: OcpVirtData = {
  type: 'OpenShift Virtualization',
  name: 'mgn02',
  url: 'https://api.mgn02.cnv-qe.rhcloud.com:6443',
  saToken: 'sha256~i3ZkqZC5P41Vs3SWSyL7Z1hnF4vifp-4CTKqsasXW6s',
};

export const networkMappingData: MappingData = {
  name: 'network-qe-vmware-mapping',
  sProviderName: 'qe-vmware',
  tProviderName: 'host',
  sProvider: 'VM Network',
  dProvider: 'Pod network',
};

export const storageMappingData: MappingData = {
  name: 'storage-qe-vmware-mapping',
  sProviderName: providerData.name,
  tProviderName: 'host',
  sProvider: 'env-esxi67-ims-h02_localdisk',
  dProvider: storageType.nfs,
};

export const planData: PlanData = {
  name: 'testplan',
  sProvider: providerData.name,
  tProvider: 'host',
  namespace: 'default',
  vmwareSourceFqdn: 'smicro-5037-08.cfme.lab.eng.rdu2.redhat.com',
  vmwareSourceVmList: ['v2v-rhel7-igor'],
  useExistingNetworkMapping: true,
  useExistingStorageMapping: true,
  providerData: providerData,
  networkMappingData: networkMappingData,
  storageMappingData: storageMappingData,
};

export const tData: TestData = {
  loginData: loginData,
  planData: planData,
};
