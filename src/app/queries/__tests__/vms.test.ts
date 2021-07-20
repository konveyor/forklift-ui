import { indexVMs } from '..';
import { MOCK_VMWARE_VMS } from '../mocks/vms.mock';

describe('indexVMs', () => {
  const indexedVMs = indexVMs(MOCK_VMWARE_VMS);

  it('sorts VMs by name and filters out templates', () => {
    expect(indexedVMs.vms.map((vm) => vm.name)).toEqual([
      'fdupont-test',
      'fdupont-test-migration',
      'fdupont-test-migration-centos',
      'pemcg-discovery01',
      'pemcg-iscsi-target',
    ]);
  });

  it('indexes VMs by id', () => {
    const { vmsById } = indexedVMs;
    expect(vmsById['vm-1630']?.name).toEqual('fdupont-test-migration');
    expect(vmsById['vm-2844']?.name).toEqual('fdupont-test');
    expect(vmsById['vm-1008']?.name).toEqual('fdupont-test-migration-centos');
    expect(vmsById['vm-2685']?.name).toEqual('pemcg-discovery01');
    expect(vmsById['vm-431']?.name).toEqual('pemcg-iscsi-target');
  });

  it('indexes VMs by selfLink', () => {
    const { vmsBySelfLink } = indexedVMs;
    expect(vmsBySelfLink['/providers/vsphere/test/vms/vm-1630']?.name).toEqual(
      'fdupont-test-migration'
    );
    expect(vmsBySelfLink['/providers/vsphere/test/vms/vm-2844']?.name).toEqual('fdupont-test');
    expect(vmsBySelfLink['/providers/vsphere/test/vms/vm-1008']?.name).toEqual(
      'fdupont-test-migration-centos'
    );
    expect(vmsBySelfLink['/providers/vsphere/test/vms/vm-2685']?.name).toEqual('pemcg-discovery01');
    expect(vmsBySelfLink['/providers/vsphere/test/vms/vm-431']?.name).toEqual('pemcg-iscsi-target');
  });

  it('finds multiple VMs by ids correctly, ignoring invalid ids', () => {
    const foundVMs = indexedVMs.findVMsByIds(['vm-2844', 'vm-something-invalid', 'vm-1630']);
    expect(foundVMs.map((vm) => vm.name)).toEqual(['fdupont-test', 'fdupont-test-migration']);
  });

  it('finds multiple VMs by selfLinks correctly, ignoring invalid selfLinks', () => {
    const foundVMs = indexedVMs.findVMsBySelfLinks([
      '/providers/vsphere/test/vms/vm-2844',
      '/some/invalid/url',
      '/providers/vsphere/test/vms/vm-1630',
    ]);
    expect(foundVMs.map((vm) => vm.name)).toEqual(['fdupont-test', 'fdupont-test-migration']);
  });
});
