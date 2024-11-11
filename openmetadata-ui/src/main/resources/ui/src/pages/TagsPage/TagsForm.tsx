/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, FormProps, Modal, Space, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OwnerLabel } from '../../components/common/OwnerLabel/OwnerLabel.component';
import { VALIDATION_MESSAGES } from '../../constants/constants';
import {
  HEX_COLOR_CODE_REGEX,
  TAG_NAME_REGEX,
} from '../../constants/regex.constants';
import { DEFAULT_FORM_VALUE } from '../../constants/Tags.constant';
import { EntityReference } from '../../generated/entity/type';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import {
  FieldProp,
  FieldTypes,
  FormItemLayout,
  HelperTextType,
} from '../../interface/FormUtils.interface';
import { generateFormFields, getField } from '../../utils/formUtils';
import { RenameFormProps } from './TagsPage.interface';

const TagsForm = ({
  visible,
  onCancel,
  header,
  initialValues,
  onSubmit,
  showMutuallyExclusive = false,
  isLoading,
  isSystemTag,
  permissions,
  isClassification,
  isEditing = false,
  isTier = false,
}: RenameFormProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { currentUser } = useApplicationStore();
  const selectedOwners =
    Form.useWatch<EntityReference | EntityReference[]>('owners', form) ?? [];

  const ownersList = Array.isArray(selectedOwners)
    ? selectedOwners
    : [selectedOwners];

  const isMutuallyExclusive = Form.useWatch<boolean | undefined>(
    'mutuallyExclusive',
    form
  );

  useEffect(() => {
    form.setFieldsValue({
      ...initialValues,
      iconURL: initialValues?.style?.iconURL,
      color: initialValues?.style?.color,
    });
  }, [initialValues]);

  const disableNameField = useMemo(
    () => isEditing && isSystemTag,
    [isEditing, isSystemTag]
  );

  const disableDisplayNameField = useMemo(
    () =>
      isEditing
        ? !(permissions?.editDisplayName || permissions?.editAll)
        : !(permissions?.createTags || isClassification),
    [isEditing, isClassification, permissions]
  );

  const disableDescriptionField = useMemo(
    () =>
      isEditing
        ? !(permissions?.editDescription || permissions?.editAll)
        : !(permissions?.createTags || isClassification),
    [isEditing, isClassification, permissions]
  );

  const disableDisabledField = useMemo(
    () =>
      isEditing
        ? !permissions?.editAll
        : !(permissions?.createTags || isClassification),
    [isEditing, isClassification, permissions]
  );

  const disableMutuallyExclusiveField = useMemo(
    () => (isEditing ? !permissions?.editAll : !isClassification),
    [isEditing, isClassification, permissions]
  );

  const formFields: FieldProp[] = [
    {
      name: 'name',
      id: 'root/name',
      required: true,
      label: t('label.name'),
      type: FieldTypes.TEXT,
      rules: [
        {
          pattern: TAG_NAME_REGEX,
          message: t('message.entity-name-validation'),
        },
        {
          type: 'string',
          min: 2,
          max: 64,
          message: t('message.entity-size-must-be-between-2-and-64', {
            entity: t('label.name'),
          }),
        },
      ],
      props: {
        'data-testid': 'name',
        disabled: disableNameField,
      },
      placeholder: t('label.name'),
    },
    {
      name: 'displayName',
      id: 'root/displayName',
      required: false,
      label: t('label.display-name'),
      type: FieldTypes.TEXT,
      props: {
        'data-testid': 'displayName',
        disabled: disableDisplayNameField,
      },
      placeholder: t('label.display-name'),
    },
    {
      name: 'description',
      required: true,
      label: t('label.description'),
      id: 'root/description',
      type: FieldTypes.DESCRIPTION,
      props: {
        'data-testid': 'description',
        initialValue: '',
        readonly: disableDescriptionField,
      },
    },
    ...(!isClassification
      ? [
          {
            name: 'iconURL',
            id: 'root/iconURL',
            label: t('label.icon-url'),
            required: false,
            placeholder: t('label.icon-url'),
            type: FieldTypes.TEXT,
            helperText: t('message.govern-url-size-message'),
            props: {
              'data-testid': 'icon-url',
              tooltipPlacement: 'right',
            },
          },
          {
            name: 'color',
            id: 'root/color',
            label: t('label.color'),
            required: false,
            type: FieldTypes.COLOR_PICKER,
            rules: [
              {
                pattern: HEX_COLOR_CODE_REGEX,
                message: t('message.hex-color-validation'),
              },
            ],
          },
        ]
      : []),
    ...(isSystemTag && !isTier
      ? ([
          {
            name: 'disabled',
            required: false,
            label: t('label.disable-tag'),
            id: 'root/disabled',
            type: FieldTypes.SWITCH,
            formItemLayout: 'horizontal',
            props: {
              'data-testid': 'disabled',
              initialValue: initialValues?.disabled ?? false,
              disabled: disableDisabledField,
            },
          },
        ] as FieldProp[])
      : []),
    ...(showMutuallyExclusive
      ? ([
          {
            name: 'mutuallyExclusive',
            label: t('label.mutually-exclusive'),
            type: FieldTypes.SWITCH,
            required: false,
            props: {
              'data-testid': 'mutually-exclusive-button',
              disabled: disableMutuallyExclusiveField,
            },
            helperText: t('message.mutually-exclusive-alert', {
              entity: t('label.classification'),
              'child-entity': t('label.tag'),
            }),
            helperTextType: HelperTextType.ALERT,
            showHelperText: Boolean(isMutuallyExclusive),
            id: 'root/mutuallyExclusive',
            formItemLayout: 'horizontal',
            formItemProps: {
              valuePropName: 'checked',
            },
          },
        ] as FieldProp[])
      : []),
  ];

  const ownerField: FieldProp = {
    name: 'owners',
    id: 'root/owner',
    required: false,
    label: t('label.owner-plural'),
    type: FieldTypes.USER_TEAM_SELECT,
    props: {
      hasPermission: true,
      children: (
        <Button
          data-testid="add-owner"
          icon={<PlusOutlined style={{ color: 'white', fontSize: '12px' }} />}
          size="small"
          type="primary"
        />
      ),
      multiple: { user: true, team: false },
    },
    formItemLayout: FormItemLayout.HORIZONTAL,
    formItemProps: {
      valuePropName: 'owners',
      trigger: 'onUpdate',
    },
  };

  /*
  const handleSave = async (data: SubmitProps) => {
    try {
      setSaving(true);
      await onSubmit(data);
      form.setFieldsValue(DEFAULT_FORM_VALUE);
    } catch {
      // Parent will handle the error
    } finally {
      setSaving(false);
    }
  };
*/

  const handleSave: FormProps['onFinish'] = async (formObj) => {
    const {
      name,
      displayName = '',
      description = '',
      disabled = false,
      mutuallyExclusive = false,
    } = formObj;

    const selectedOwners =
      ownersList.length > 0
        ? ownersList
        : [
            {
              id: currentUser?.id ?? '',
              type: 'user',
            },
          ];

    const data = {
      name: name.trim(),
      displayName: displayName?.trim(),
      description: description,
      disabled,
      mutuallyExclusive,
      owners: selectedOwners,
    };
    try {
      setSaving(true);
      await onSubmit(data);
      form.setFieldsValue(DEFAULT_FORM_VALUE);
    } catch {
      // Parent will handle the error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      centered
      destroyOnClose
      closable={false}
      data-testid="modal-container"
      okButtonProps={{
        form: 'tags',
        type: 'primary',
        htmlType: 'submit',
        loading: isLoading || saving,
      }}
      okText={t('label.save')}
      open={visible}
      title={
        <Typography.Text strong data-testid="header">
          {header}
        </Typography.Text>
      }
      width={750}
      onCancel={() => {
        form.setFieldsValue(DEFAULT_FORM_VALUE);
        onCancel();
      }}>
      <Form
        form={form}
        initialValues={initialValues ?? DEFAULT_FORM_VALUE}
        layout="vertical"
        name="tags"
        validateMessages={VALIDATION_MESSAGES}
        onFinish={handleSave}>
        {generateFormFields(formFields)}

        <div className="m-t-xss">
          {isClassification && getField(ownerField)}

          {Boolean(ownersList.length) && (
            <Space wrap data-testid="owner-container" size={[8, 8]}>
              <OwnerLabel owners={ownersList} />
            </Space>
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default TagsForm;
